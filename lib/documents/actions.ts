"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";

import { requireOrgAccess } from "@/lib/auth/org";
import { db } from "@/lib/db";
import { newId } from "@/lib/db/id";
import { documents } from "@/lib/db/documents-schema";
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
  | { ok: false; error: DocumentUploadError };

export type DocumentSimpleActionResult =
  | { ok: true }
  | { ok: false; error: "forbidden" | "validation" | "notFound" | "blobDeleteFailed" | "unknown" };

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
    });

    await incrementOrganizationStorageUsage(organizationId, file.size);
  } catch {
    return { ok: false, error: "unknown" };
  }

  revalidatePath(`/${orgSlug}/documents`);
  return { ok: true, documentId };
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
