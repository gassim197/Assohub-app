import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { user } from "@/lib/db/auth-schema";
import { documents } from "@/lib/db/documents-schema";
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
}

/**
 * Liste des documents de l'organisation, plus récents d'abord. `category`
 * filtre en plus (chips/select de la page) sans jamais remplacer le
 * filtrage multi-tenant. Pas de pagination en V1 (volume attendu faible,
 * borné par le quota de 200 Mo) — même décision que `listMeetingDatesForCalendar`.
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
    })
    .from(documents)
    .innerJoin(user, eq(documents.uploadedByUserId, user.id))
    .where(and(...conditions))
    .orderBy(desc(documents.createdAt));
}
