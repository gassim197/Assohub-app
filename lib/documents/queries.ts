import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { user } from "@/lib/db/auth-schema";
import { documents } from "@/lib/db/documents-schema";
import { meetings } from "@/lib/db/meetings-schema";
import { payments } from "@/lib/db/cotisations-schema";
import type { DocumentCategory } from "./constants";

export type DocumentRow = typeof documents.$inferSelect;

/**
 * Récupère un document par son id, borné à l'organisation et hors supprimés.
 * Multi-tenant strict : un `documentId` d'une autre organisation renvoie
 * `null` — c'est la garde utilisée par la route de téléchargement avant tout
 * accès au blob.
 */
export async function getDocumentById(
  organizationId: string,
  documentId: string,
): Promise<DocumentRow | null> {
  const [row] = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.id, documentId),
        eq(documents.organizationId, organizationId),
        isNull(documents.deletedAt),
      ),
    )
    .limit(1);

  return row ?? null;
}

/**
 * Pathnames Blob de tous les documents (actifs ET soft-deleted) d'une
 * organisation — utilisé uniquement par `deleteOrganization` pour purger
 * Vercel Blob avant le hard delete des lignes `documents`. On inclut les
 * soft-deleted : si leur suppression Blob avait échoué (`deleteDocumentBlob`
 * tolère l'échec, §5 du plan), leur fichier existe peut-être toujours et doit
 * être nettoyé maintenant, sans quoi il resterait orphelin indéfiniment.
 */
export async function listDocumentBlobPathnamesForOrganization(
  organizationId: string,
): Promise<string[]> {
  const rows = await db
    .select({ blobPathname: documents.blobPathname })
    .from(documents)
    .where(eq(documents.organizationId, organizationId));

  return rows.map((row) => row.blobPathname);
}

export interface DocumentWithUploaderRow {
  id: string;
  displayName: string;
  fileName: string;
  category: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
  uploadedByName: string;
  paymentId: string | null;
  meetingId: string | null;
  /** Nécessaire pour construire le lien « Lié au paiement du... » (pas de page dédiée à un paiement, il vit sous sa cotisation). */
  linkedPaymentCotisationId: string | null;
  linkedPaymentPaidAt: string | null;
  linkedMeetingScheduledAt: Date | null;
}

/**
 * Liste des documents de l'organisation, plus récents d'abord. `category`
 * filtre en plus (chips/select de la page) sans jamais remplacer le
 * filtrage multi-tenant. Pas de pagination en V1 (volume attendu faible,
 * borné par le quota de 200 Mo) — même décision que `listMeetingDatesForCalendar`.
 *
 * LEFT JOIN sur `payments`/`meetings` sans risque de duplication de lignes :
 * `documents` est la table pilote et chaque document ne référence au plus
 * qu'un seul paiement ET/OU une seule réunion (colonnes nullables, pas de
 * relation many-to-many).
 */
export async function listDocuments(
  organizationId: string,
  category?: DocumentCategory,
): Promise<DocumentWithUploaderRow[]> {
  const conditions = [eq(documents.organizationId, organizationId), isNull(documents.deletedAt)];
  if (category) {
    conditions.push(eq(documents.category, category));
  }

  return db
    .select({
      id: documents.id,
      displayName: documents.displayName,
      fileName: documents.fileName,
      category: documents.category,
      mimeType: documents.mimeType,
      sizeBytes: documents.sizeBytes,
      createdAt: documents.createdAt,
      uploadedByName: user.name,
      paymentId: documents.paymentId,
      meetingId: documents.meetingId,
      linkedPaymentCotisationId: payments.cotisationId,
      linkedPaymentPaidAt: payments.paidAt,
      linkedMeetingScheduledAt: meetings.scheduledAt,
    })
    .from(documents)
    .innerJoin(user, eq(documents.uploadedByUserId, user.id))
    // Filtre `deletedAt` dans la condition de jointure (pas dans le WHERE) :
    // un document rattaché à un paiement/une réunion supprimé(e) reste listé,
    // seules les colonnes `linked*` passent à null — le lien disparaît au lieu
    // de pointer vers une page 404.
    .leftJoin(payments, and(eq(documents.paymentId, payments.id), isNull(payments.deletedAt)))
    .leftJoin(meetings, and(eq(documents.meetingId, meetings.id), isNull(meetings.deletedAt)))
    .where(and(...conditions))
    .orderBy(desc(documents.createdAt));
}

export interface AttachedDocumentRow {
  id: string;
  displayName: string;
  mimeType: string;
  paymentId: string | null;
  meetingId: string | null;
}

/** Documents rattachés à une réunion (PV signé ou tout autre document lié), plus récents d'abord. */
export async function listDocumentsForMeeting(
  organizationId: string,
  meetingId: string,
): Promise<AttachedDocumentRow[]> {
  return db
    .select({
      id: documents.id,
      displayName: documents.displayName,
      mimeType: documents.mimeType,
      paymentId: documents.paymentId,
      meetingId: documents.meetingId,
    })
    .from(documents)
    .where(
      and(
        eq(documents.organizationId, organizationId),
        eq(documents.meetingId, meetingId),
        isNull(documents.deletedAt),
      ),
    )
    .orderBy(desc(documents.createdAt));
}

/** Documents rattachés à un ensemble de paiements (historique des paiements d'une cotisation), en un seul aller-retour. */
export async function listDocumentsForPayments(
  organizationId: string,
  paymentIds: string[],
): Promise<AttachedDocumentRow[]> {
  if (paymentIds.length === 0) return [];

  return db
    .select({
      id: documents.id,
      displayName: documents.displayName,
      mimeType: documents.mimeType,
      paymentId: documents.paymentId,
      meetingId: documents.meetingId,
    })
    .from(documents)
    .where(
      and(
        eq(documents.organizationId, organizationId),
        inArray(documents.paymentId, paymentIds),
        isNull(documents.deletedAt),
      ),
    )
    .orderBy(desc(documents.createdAt));
}

/**
 * Documents "généraux" de l'organisation — non encore rattachés à un paiement
 * ni à une réunion — candidats au sélecteur « Choisir parmi les documents
 * existants » (`AttachDocumentDialog`). Un document déjà rattaché à une autre
 * réunion/paiement n'est pas proposé : éviter qu'attacher un document en vole
 * implicitement un autre.
 */
export async function listUnattachedDocuments(
  organizationId: string,
): Promise<AttachedDocumentRow[]> {
  return db
    .select({
      id: documents.id,
      displayName: documents.displayName,
      mimeType: documents.mimeType,
      paymentId: documents.paymentId,
      meetingId: documents.meetingId,
    })
    .from(documents)
    .where(
      and(
        eq(documents.organizationId, organizationId),
        isNull(documents.paymentId),
        isNull(documents.meetingId),
        isNull(documents.deletedAt),
      ),
    )
    .orderBy(desc(documents.createdAt));
}
