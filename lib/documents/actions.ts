"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";

import { requireOrgAccess } from "@/lib/auth/org";
import { db } from "@/lib/db";
import { newId } from "@/lib/db/id";
import { documents } from "@/lib/db/documents-schema";
import { getPaymentById } from "@/lib/cotisations/payment-queries";
import { getMeetingById } from "@/lib/meetings/queries";
import { deleteDocumentBlob, uploadDocumentBlob } from "./blob";
import { MAX_FILE_SIZE_BYTES } from "./constants";
import { detectAcceptedMimeType } from "./file-validation";
import { canManageDocuments } from "./permissions";
import {
  decrementOrganizationStorageUsage,
  getOrganizationStorageUsage,
  incrementOrganizationStorageUsage,
  ORGANIZATION_STORAGE_QUOTA_BYTES,
} from "./quota";
import { documentUploadServerSchema, renameDocumentServerSchema } from "./schema";

/**
 * Cible de rattachement optionnelle (justificatif de paiement ou PV/document
 * de réunion) — au plus l'une des deux, jamais les deux (schema-design
 * §"Rattachement optionnel").
 */
export interface DocumentAttachTarget {
  paymentId?: string;
  meetingId?: string;
}

interface ResolvedAttachTarget {
  paymentId: string | null;
  meetingId: string | null;
  /** Pour revalider la page de détail de la cotisation (pas de page dédiée à un paiement seul). */
  cotisationId: string | null;
}

/**
 * Vérifie que la cible de rattachement appartient bien à l'organisation avant
 * de l'accepter — `paymentId`/`meetingId` viennent du client (FormData ou
 * argument d'action), jamais dignes de confiance sans cette vérification
 * (un id d'une autre organisation romprait le multi-tenant strict).
 */
async function resolveAttachTarget(
  organizationId: string,
  target: DocumentAttachTarget,
): Promise<ResolvedAttachTarget | null> {
  if (target.paymentId) {
    const payment = await getPaymentById(organizationId, target.paymentId);
    if (!payment) return null;
    return { paymentId: payment.id, meetingId: null, cotisationId: payment.cotisationId };
  }
  if (target.meetingId) {
    const meeting = await getMeetingById(organizationId, target.meetingId);
    if (!meeting) return null;
    return { paymentId: null, meetingId: meeting.id, cotisationId: null };
  }
  return { paymentId: null, meetingId: null, cotisationId: null };
}

export type DocumentUploadError =
  | "forbidden"
  | "validation"
  | "fileMissing"
  | "fileTooLarge"
  | "invalidType"
  | "quotaExceeded"
  | "unknown";

export type DocumentActionResult =
  | { ok: true; documentId: string }
  | { ok: false; error: DocumentUploadError | "invalidTarget" };

export type DocumentSimpleActionResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "forbidden"
        | "validation"
        | "notFound"
        | "blobDeleteFailed"
        | "invalidTarget"
        | "alreadyAttached"
        | "unknown";
    };

/**
 * Upload d'un document (checkpoint : permissions admin/owner, validation
 * serveur du type réel + taille + quota — jamais de confiance dans l'UI ni
 * dans le `File.type` déclaré par le navigateur).
 *
 * Ordre des vérifications choisi pour ne jamais appeler `put()` (donc jamais
 * facturer de stockage Blob) sur un fichier qui sera de toute façon rejeté :
 * permissions → métadonnées → taille déclarée → type réel (magic bytes) →
 * quota → upload.
 */
export async function uploadDocument(
  orgSlug: string,
  formData: FormData,
): Promise<DocumentActionResult> {
  const { organizationId, userId } = await requireOrgAccess(orgSlug);

  const canManage = await canManageDocuments(organizationId, userId);
  if (!canManage) {
    return { ok: false, error: "forbidden" };
  }

  const parsed = documentUploadServerSchema.safeParse({
    category: formData.get("category"),
    displayName: formData.get("displayName"),
  });
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "fileMissing" };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: "fileTooLarge" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detectedMimeType = await detectAcceptedMimeType(buffer, file.name);
  if (!detectedMimeType) {
    return { ok: false, error: "invalidType" };
  }

  const rawPaymentId = formData.get("paymentId");
  const rawMeetingId = formData.get("meetingId");
  const target = await resolveAttachTarget(organizationId, {
    paymentId: typeof rawPaymentId === "string" ? rawPaymentId : undefined,
    meetingId: typeof rawMeetingId === "string" ? rawMeetingId : undefined,
  });
  if (!target) {
    return { ok: false, error: "invalidTarget" };
  }

  const currentUsage = await getOrganizationStorageUsage(organizationId);
  if (currentUsage + file.size > ORGANIZATION_STORAGE_QUOTA_BYTES) {
    return { ok: false, error: "quotaExceeded" };
  }

  const documentId = newId();

  try {
    const blob = await uploadDocumentBlob({
      organizationId,
      documentId,
      fileName: file.name,
      content: buffer,
      mimeType: detectedMimeType,
    });

    await db.insert(documents).values({
      id: documentId,
      organizationId,
      uploadedByUserId: userId,
      fileName: file.name,
      displayName: parsed.data.displayName,
      category: parsed.data.category,
      mimeType: detectedMimeType,
      sizeBytes: file.size,
      blobUrl: blob.url,
      blobPathname: blob.pathname,
      paymentId: target.paymentId,
      meetingId: target.meetingId,
    });

    await incrementOrganizationStorageUsage(organizationId, file.size);
  } catch {
    return { ok: false, error: "unknown" };
  }

  revalidatePath(`/${orgSlug}/documents`);
  if (target.meetingId) revalidatePath(`/${orgSlug}/meetings/${target.meetingId}`);
  if (target.cotisationId) revalidatePath(`/${orgSlug}/cotisations/${target.cotisationId}`);
  return { ok: true, documentId };
}

/**
 * Rattache un document EXISTANT et jusqu'ici non rattaché à un paiement ou
 * une réunion (« Choisir parmi les documents existants »). Refuse un document
 * déjà rattaché : voler son rattachement à un autre paiement/réunion serait
 * une surprise silencieuse pour qui l'a attaché en premier.
 */
export async function linkDocumentToTarget(
  orgSlug: string,
  documentId: string,
  target: DocumentAttachTarget,
): Promise<DocumentSimpleActionResult> {
  const { organizationId, userId } = await requireOrgAccess(orgSlug);

  const canManage = await canManageDocuments(organizationId, userId);
  if (!canManage) {
    return { ok: false, error: "forbidden" };
  }

  const resolved = await resolveAttachTarget(organizationId, target);
  if (!resolved || (!resolved.paymentId && !resolved.meetingId)) {
    return { ok: false, error: "invalidTarget" };
  }

  const [document] = await db
    .select({ paymentId: documents.paymentId, meetingId: documents.meetingId })
    .from(documents)
    .where(
      and(
        eq(documents.id, documentId),
        eq(documents.organizationId, organizationId),
        isNull(documents.deletedAt),
      ),
    )
    .limit(1);

  if (!document) {
    return { ok: false, error: "notFound" };
  }
  if (document.paymentId || document.meetingId) {
    return { ok: false, error: "alreadyAttached" };
  }

  try {
    await db
      .update(documents)
      .set({ paymentId: resolved.paymentId, meetingId: resolved.meetingId })
      .where(eq(documents.id, documentId));
  } catch {
    return { ok: false, error: "unknown" };
  }

  revalidatePath(`/${orgSlug}/documents`);
  if (resolved.meetingId) revalidatePath(`/${orgSlug}/meetings/${resolved.meetingId}`);
  if (resolved.cotisationId) revalidatePath(`/${orgSlug}/cotisations/${resolved.cotisationId}`);
  return { ok: true };
}

/** Renomme (nom d'affichage uniquement) un document — admin/owner. */
export async function renameDocument(
  orgSlug: string,
  documentId: string,
  raw: unknown,
): Promise<DocumentSimpleActionResult> {
  const { organizationId, userId } = await requireOrgAccess(orgSlug);

  const canManage = await canManageDocuments(organizationId, userId);
  if (!canManage) {
    return { ok: false, error: "forbidden" };
  }

  const parsed = renameDocumentServerSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }

  try {
    const [updated] = await db
      .update(documents)
      .set({ displayName: parsed.data.displayName })
      .where(
        and(
          eq(documents.id, documentId),
          eq(documents.organizationId, organizationId),
          isNull(documents.deletedAt),
        ),
      )
      .returning({ id: documents.id });

    if (!updated) {
      return { ok: false, error: "notFound" };
    }
  } catch {
    return { ok: false, error: "unknown" };
  }

  revalidatePath(`/${orgSlug}/documents`);
  return { ok: true };
}

/**
 * Supprime un document — admin/owner. Le blob est supprimé AVANT la ligne DB
 * et le décrément de quota : si la suppression Blob échoue, on n'efface rien
 * (le document reste visible, l'utilisateur peut réessayer) plutôt que de
 * soft-delete la ligne pendant qu'un fichier fantôme continue d'être facturé
 * sans qu'aucune action de l'UI ne permette plus de le nettoyer (règle §5 du
 * plan : gérer explicitement l'échec de suppression Blob).
 */
export async function deleteDocument(
  orgSlug: string,
  documentId: string,
): Promise<DocumentSimpleActionResult> {
  const { organizationId, userId } = await requireOrgAccess(orgSlug);

  const canManage = await canManageDocuments(organizationId, userId);
  if (!canManage) {
    return { ok: false, error: "forbidden" };
  }

  const [document] = await db
    .select({
      id: documents.id,
      blobPathname: documents.blobPathname,
      sizeBytes: documents.sizeBytes,
    })
    .from(documents)
    .where(
      and(
        eq(documents.id, documentId),
        eq(documents.organizationId, organizationId),
        isNull(documents.deletedAt),
      ),
    )
    .limit(1);

  if (!document) {
    return { ok: false, error: "notFound" };
  }

  const blobResult = await deleteDocumentBlob(document.blobPathname);
  if (!blobResult.ok) {
    return { ok: false, error: "blobDeleteFailed" };
  }

  try {
    await db
      .update(documents)
      .set({ deletedAt: new Date() })
      .where(eq(documents.id, document.id));

    await decrementOrganizationStorageUsage(organizationId, document.sizeBytes);
  } catch {
    return { ok: false, error: "unknown" };
  }

  revalidatePath(`/${orgSlug}/documents`);
  return { ok: true };
}
