import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organization, user } from "./auth-schema";
import { associationMembers } from "./members-schema";

// ─── cotisation_types ─────────────────────────────────────────────────────────
// Définitions des types de cotisations par organisation.
// Enum frequency : one_time | monthly | quarterly | annually
// Un job cron génère une cotisation par membre actif au début de chaque période.

export const cotisationTypes = pgTable(
  "cotisation_types",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id),
    name: text("name").notNull(),
    description: text("description"),
    defaultAmount: bigint("default_amount", { mode: "number" }).notNull(), // centimes GNF
    frequency: text("frequency").notNull(), // 'one_time' | 'monthly' | 'quarterly' | 'annually'
    isActive: boolean("is_active").notNull().default(true),
    autoGenerate: boolean("auto_generate").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("cotisation_types_org_idx")
      .on(table.organizationId)
      .where(sql`deleted_at IS NULL`),
  ]
);

// ─── cotisations ──────────────────────────────────────────────────────────────
// Obligation de paiement d'un membre pour une période donnée.
// paid_amount et status sont recalculés à chaque création/modif/suppression de payment.
// Enum status : en_attente | partiel | paye | en_retard

export const cotisations = pgTable(
  "cotisations",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id),
    cotisationTypeId: text("cotisation_type_id")
      .notNull()
      .references(() => cotisationTypes.id),
    memberId: text("member_id")
      .notNull()
      .references(() => associationMembers.id),
    dueAmount: bigint("due_amount", { mode: "number" }).notNull(), // centimes GNF
    // Forme canonique neutre ("2026-07", "2026-Q3", "2026"), pas de libellé figé
    // dans une langue : NEXT_LOCALE est par navigateur, pas par organisation.
    // L'affichage localisé est calculé à la lecture (lib/cotisations/generation.ts).
    periodLabel: text("period_label").notNull(),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    dueDate: date("due_date").notNull(),
    status: text("status").notNull().default("en_attente"),
    paidAmount: bigint("paid_amount", { mode: "number" }).notNull().default(0), // centimes GNF
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("cotisations_org_status_idx")
      .on(table.organizationId, table.status)
      .where(sql`deleted_at IS NULL`),
    index("cotisations_member_idx")
      .on(table.memberId)
      .where(sql`deleted_at IS NULL`),
    index("cotisations_due_date_idx")
      .on(table.organizationId, table.dueDate)
      .where(sql`deleted_at IS NULL`),
    // Garde-fou d'idempotence au niveau DB : neon-http ne supporte pas les
    // transactions interactives (cf. ADR-0002), donc pas de verrou applicatif
    // possible contre une course entre deux générations concurrentes. Le
    // NOT EXISTS applicatif protège les appels séquentiels ; cet index protège
    // le cas concurrent (INSERT ... ON CONFLICT DO NOTHING).
    uniqueIndex("cotisations_type_period_member_unique_idx")
      .on(table.cotisationTypeId, table.periodStart, table.memberId)
      .where(sql`deleted_at IS NULL`),
  ]
);

// ─── payments ─────────────────────────────────────────────────────────────────
// Versement effectif lié à une cotisation. Paiements partiels possibles.
// À la création : met à jour cotisations.paid_amount + cotisations.status,
//                 et crée une transaction de type 'revenue' dans la même tx SQL.
// Enum payment_method : especes | orange_money | wave | mtn_momo | paycard |
//                       soutra_money | virement_bancaire | cheque | autre
// payment_reference est obligatoire pour les méthodes digitales (validation app).

export const payments = pgTable(
  "payments",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id),
    cotisationId: text("cotisation_id")
      .notNull()
      .references(() => cotisations.id),
    memberId: text("member_id")
      .notNull()
      .references(() => associationMembers.id),
    recordedByUserId: text("recorded_by_user_id")
      .notNull()
      .references(() => user.id),
    amount: bigint("amount", { mode: "number" }).notNull(), // centimes GNF
    paidAt: date("paid_at").notNull().default(sql`CURRENT_DATE`),
    paymentMethod: text("payment_method").notNull(),
    paymentReference: text("payment_reference"),
    note: text("note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("payments_cotisation_idx")
      .on(table.cotisationId)
      .where(sql`deleted_at IS NULL`),
    index("payments_org_date_idx")
      .on(table.organizationId, table.paidAt)
      .where(sql`deleted_at IS NULL`),
    index("payments_member_idx")
      .on(table.memberId)
      .where(sql`deleted_at IS NULL`),
  ]
);

// ─── payment_reminders ────────────────────────────────────────────────────────
// Historique des relances envoyées aux membres en retard.
// V1 : seul 'email' est implémenté. 'sms' et 'whatsapp' sont des valeurs prévues.

export const paymentReminders = pgTable(
  "payment_reminders",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id),
    cotisationId: text("cotisation_id")
      .notNull()
      .references(() => cotisations.id),
    memberId: text("member_id")
      .notNull()
      .references(() => associationMembers.id),
    sentByUserId: text("sent_by_user_id")
      .notNull()
      .references(() => user.id),
    channel: text("channel").notNull().default("email"), // 'email' | 'sms' (V1.1+) | 'whatsapp' (V2)
    sentAt: timestamp("sent_at").defaultNow().notNull(),
    deliveredAt: timestamp("delivered_at"),
    failedAt: timestamp("failed_at"),
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("reminders_cotisation_idx")
      .on(table.cotisationId)
      .where(sql`deleted_at IS NULL`),
    index("reminders_member_sent_idx")
      .on(table.memberId, table.sentAt)
      .where(sql`deleted_at IS NULL`),
  ]
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const cotisationTypesRelations = relations(
  cotisationTypes,
  ({ one }) => ({
    organization: one(organization, {
      fields: [cotisationTypes.organizationId],
      references: [organization.id],
    }),
  })
);

export const cotisationsRelations = relations(cotisations, ({ one }) => ({
  organization: one(organization, {
    fields: [cotisations.organizationId],
    references: [organization.id],
  }),
  cotisationType: one(cotisationTypes, {
    fields: [cotisations.cotisationTypeId],
    references: [cotisationTypes.id],
  }),
  member: one(associationMembers, {
    fields: [cotisations.memberId],
    references: [associationMembers.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  organization: one(organization, {
    fields: [payments.organizationId],
    references: [organization.id],
  }),
  cotisation: one(cotisations, {
    fields: [payments.cotisationId],
    references: [cotisations.id],
  }),
  member: one(associationMembers, {
    fields: [payments.memberId],
    references: [associationMembers.id],
  }),
  recordedBy: one(user, {
    fields: [payments.recordedByUserId],
    references: [user.id],
  }),
}));

export const paymentRemindersRelations = relations(
  paymentReminders,
  ({ one }) => ({
    organization: one(organization, {
      fields: [paymentReminders.organizationId],
      references: [organization.id],
    }),
    cotisation: one(cotisations, {
      fields: [paymentReminders.cotisationId],
      references: [cotisations.id],
    }),
    member: one(associationMembers, {
      fields: [paymentReminders.memberId],
      references: [associationMembers.id],
    }),
    sentBy: one(user, {
      fields: [paymentReminders.sentByUserId],
      references: [user.id],
    }),
  })
);
