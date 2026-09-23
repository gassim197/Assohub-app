import { relations, sql } from "drizzle-orm";
import { bigint, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organization, user } from "./auth-schema";
import { payments } from "./cotisations-schema";
import { meetings } from "./meetings-schema";

// ─── documents ────────────────────────────────────────────────────────────────
// Module Gestion des documents (V1.1). Stockage Vercel Blob (access: 'private',
// jamais d'URL exposée directement au client — cf. lib/documents/blob.ts et la
// route de téléchargement app/(dashboard)/[orgSlug]/documents/[documentId]/download).
//
// Enum category : statuts_reglements | proces_verbaux | recus_justificatifs |
//                 rapports | correspondance | autres
//
// Rattachement optionnel : payment_id (reçu scanné) ou meeting_id (PV signé),
// jamais les deux à la fois (validation app, pas de contrainte DB — un document
// général de l'organisation n'a ni l'un ni l'autre).

export const documents = pgTable(
  "documents",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id),
    uploadedByUserId: text("uploaded_by_user_id")
      .notNull()
      .references(() => user.id),

    fileName: text("file_name").notNull(),
    displayName: text("display_name").notNull(),
    category: text("category").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),

    blobUrl: text("blob_url").notNull(),
    blobPathname: text("blob_pathname").notNull(),

    paymentId: text("payment_id").references(() => payments.id),
    meetingId: text("meeting_id").references(() => meetings.id),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("documents_org_category_idx")
      .on(table.organizationId, table.category)
      .where(sql`deleted_at IS NULL`),
    index("documents_org_created_idx")
      .on(table.organizationId, table.createdAt)
      .where(sql`deleted_at IS NULL`),
    index("documents_payment_idx")
      .on(table.paymentId)
      .where(sql`payment_id IS NOT NULL AND deleted_at IS NULL`),
    index("documents_meeting_idx")
      .on(table.meetingId)
      .where(sql`meeting_id IS NOT NULL AND deleted_at IS NULL`),
  ]
);

// ─── organization_storage_usage ────────────────────────────────────────────────
// Compteur d'octets utilisés par organisation, maintenu de façon incrémentale
// (+= à l'upload, -= à la suppression) pour éviter un SUM() sur `documents` à
// chaque affichage de la barre de quota. Une ligne par organisation, créée à
// la volée (upsert) au premier upload.
//
// Fenêtre de course théorique sur neon-http (pas de transaction interactive) :
// acceptée sciemment, cf. plan validé — usage associatif, pas de concurrence
// élevée attendue.

export const organizationStorageUsage = pgTable("organization_storage_usage", {
  organizationId: text("organization_id")
    .primaryKey()
    .references(() => organization.id),
  usedBytes: bigint("used_bytes", { mode: "number" }).notNull().default(0),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const documentsRelations = relations(documents, ({ one }) => ({
  organization: one(organization, {
    fields: [documents.organizationId],
    references: [organization.id],
  }),
  uploadedBy: one(user, {
    fields: [documents.uploadedByUserId],
    references: [user.id],
  }),
  payment: one(payments, {
    fields: [documents.paymentId],
    references: [payments.id],
  }),
  meeting: one(meetings, {
    fields: [documents.meetingId],
    references: [meetings.id],
  }),
}));

export const organizationStorageUsageRelations = relations(
  organizationStorageUsage,
  ({ one }) => ({
    organization: one(organization, {
      fields: [organizationStorageUsage.organizationId],
      references: [organization.id],
    }),
  })
);
