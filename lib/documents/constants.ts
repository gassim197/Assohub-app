import type { badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

// ─── Catégories (prédéfinies, pas d'arborescence de dossiers) ────────────────

export const DOCUMENT_CATEGORIES = [
  "statuts_reglements",
  "proces_verbaux",
  "recus_justificatifs",
  "rapports",
  "correspondance",
  "autres",
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const DEFAULT_DOCUMENT_CATEGORY: DocumentCategory = "autres";

export function isDocumentCategory(value: string): value is DocumentCategory {
  return (DOCUMENT_CATEGORIES as readonly string[]).includes(value);
}

export const DOCUMENT_CATEGORY_BADGE_VARIANT: Record<DocumentCategory, BadgeVariant> = {
  statuts_reglements: "secondary",
  proces_verbaux: "info",
  recus_justificatifs: "success",
  rapports: "warning",
  correspondance: "outline",
  autres: "default",
};

// ─── Types de fichiers acceptés ───────────────────────────────────────────────
// Refus explicite de tout le reste (notamment vidéo et audio). Validation du
// type RÉEL côté serveur (magic bytes, cf. lib/documents/file-validation.ts) —
// cette liste sert de référentiel des types autorisés, pas de simple filtre
// d'extension.

export const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export type AcceptedMimeType = (typeof ACCEPTED_MIME_TYPES)[number];

export function isAcceptedMimeType(value: string): value is AcceptedMimeType {
  return (ACCEPTED_MIME_TYPES as readonly string[]).includes(value);
}

export const ACCEPTED_FILE_EXTENSIONS = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
];

// ─── Quotas (critiques — le stockage est facturé à l'organisation gestionnaire) ─

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 Mo
export const MAX_ORGANIZATION_STORAGE_BYTES = 200 * 1024 * 1024; // 200 Mo
