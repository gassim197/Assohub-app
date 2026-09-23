import { z } from "zod";

import { DOCUMENT_CATEGORIES } from "./constants";

/**
 * Schéma de la métadonnée d'upload (catégorie + nom d'affichage). La
 * validation du fichier lui-même (type réel, taille, quota) est faite à part
 * dans `uploadDocument` — elle a besoin de lire le buffer, ce que zod ne fait
 * pas.
 */
export interface DocumentUploadMessages {
  displayNameMin: string;
}

export function buildDocumentUploadSchema(m: DocumentUploadMessages) {
  return z.object({
    category: z.enum(DOCUMENT_CATEGORIES),
    displayName: z.string().trim().min(1, m.displayNameMin).max(200),
  });
}

const RAW_UPLOAD_MESSAGES: DocumentUploadMessages = {
  displayNameMin: "displayNameMin",
};

export const documentUploadServerSchema = buildDocumentUploadSchema(RAW_UPLOAD_MESSAGES);

export const renameDocumentServerSchema = z.object({
  displayName: z.string().trim().min(1, "displayNameMin").max(200),
});
