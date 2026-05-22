import { relations, sql } from "drizzle-orm";
import {
  bigint,
  date,
  index,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { organization, user } from "./auth-schema";
import { payments } from "./cotisations-schema";

// ─── transactions ─────────────────────────────────────────────────────────────
// Comptabilité unifiée. Toutes les entrées et sorties d'argent.
// Enum type : revenue | expense
//
// Enum category (revenue) : cotisations | dons | subventions | recettes_evenements |
//                           ventes | partenariats | autre_revenu
// Enum category (expense) : loyer_charges | fournitures | communication | evenements |
//                           transport | personnel | frais_bancaires | dons_verses |
//                           impots_taxes | autre_depense
//
// Enum status : pending | validated | rejected
//   → défaut 'validated' en V1. Le workflow de validation (pending/rejected) est baked
//     pour V1.1+ mais non exposé en UI V1.
//
// Règle : à chaque création de payment, une transaction 'revenue'/'cotisations' est
//         créée automatiquement dans la même transaction SQL (payment_id rempli).
//         À la suppression d'un payment (soft delete), la transaction associée est aussi
//         soft deleted.

export const transactions = pgTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id),
    recordedByUserId: text("recorded_by_user_id")
      .notNull()
      .references(() => user.id),
    type: text("type").notNull(), // 'revenue' | 'expense'
    amount: bigint("amount", { mode: "number" }).notNull(), // centimes GNF, toujours positif
    occurredAt: date("occurred_at").notNull().default(sql`CURRENT_DATE`),
    category: text("category").notNull(),
    description: text("description").notNull(),
    paymentId: text("payment_id").references(() => payments.id),
    referenceDocument: text("reference_document"),
    status: text("status").notNull().default("validated"),
    validatedByUserId: text("validated_by_user_id").references(() => user.id),
    validatedAt: timestamp("validated_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("transactions_org_type_date_idx")
      .on(table.organizationId, table.type, table.occurredAt)
      .where(sql`deleted_at IS NULL AND status = 'validated'`),
    index("transactions_org_category_idx")
      .on(table.organizationId, table.category)
      .where(sql`deleted_at IS NULL`),
    index("transactions_payment_idx")
      .on(table.paymentId)
      .where(sql`payment_id IS NOT NULL AND deleted_at IS NULL`),
  ]
);

// ─── Relations ────────────────────────────────────────────────────────────────
// transactions a deux FK vers user (recordedBy et validatedBy).
// relationName est obligatoire pour lever l'ambiguïté dans le query builder Drizzle.

export const transactionsRelations = relations(transactions, ({ one }) => ({
  organization: one(organization, {
    fields: [transactions.organizationId],
    references: [organization.id],
  }),
  recordedBy: one(user, {
    fields: [transactions.recordedByUserId],
    references: [user.id],
    relationName: "transactions_recorded_by",
  }),
  validatedBy: one(user, {
    fields: [transactions.validatedByUserId],
    references: [user.id],
    relationName: "transactions_validated_by",
  }),
  payment: one(payments, {
    fields: [transactions.paymentId],
    references: [payments.id],
  }),
}));
