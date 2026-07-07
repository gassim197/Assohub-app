import { relations, sql } from "drizzle-orm";
import {
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organization, user } from "./auth-schema";

// ─── pending_invitations ──────────────────────────────────────────────────────
// Invitations envoyées par l'admin à des personnes qui n'ont pas encore de compte.
// Workflow : admin saisit fiche → token envoyé par email → invité crée son compte.

export const pendingInvitations = pgTable(
  "pending_invitations",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id),
    fullName: text("full_name").notNull(),
    phoneNumber: text("phone_number"),
    email: text("email").notNull(),
    intendedRole: text("intended_role").notNull().default("membre"),
    personalMessage: text("personal_message"),
    token: text("token").notNull().unique(),
    invitedByUserId: text("invited_by_user_id")
      .notNull()
      .references(() => user.id),
    expiresAt: timestamp("expires_at").notNull(),
    acceptedAt: timestamp("accepted_at"),
    declinedAt: timestamp("declined_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("pending_invitations_org_idx")
      .on(table.organizationId, table.acceptedAt, table.declinedAt)
      .where(sql`deleted_at IS NULL`),
  ]
);

// ─── organization_invite_links ────────────────────────────────────────────────
// Liens d'invitation partageables (WhatsApp, etc.). Deux modes : auto ou manual.
// En mode manual, l'association_member est créé avec status = 'en_attente_validation'.

export const organizationInviteLinks = pgTable(
  "organization_invite_links",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id),
    token: text("token").notNull().unique(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id),
    acceptanceMode: text("acceptance_mode").notNull().default("manual"), // 'auto' | 'manual'
    defaultRole: text("default_role").notNull().default("membre"),
    expiresAt: timestamp("expires_at"),
    maxUses: integer("max_uses"),
    usesCount: integer("uses_count").notNull().default(0),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("invite_links_org_idx")
      .on(table.organizationId)
      .where(sql`revoked_at IS NULL AND deleted_at IS NULL`),
  ]
);

// ─── association_members ──────────────────────────────────────────────────────
// Annuaire métier des membres d'une organisation. Distinct de `member` (Better-Auth).
// user_id est nullable : un membre de l'annuaire peut ne pas avoir de compte AssoHub.
//
// Enum role : president | vice_president | tresorier | secretaire |
//             charge_communication | membre | administrateur | autre
//
// Enum status : actif | démissionné | exclu | suspendu | décédé | en_attente_validation
//   → en_attente_validation : utilisé quand acceptance_mode = 'manual' sur un invite link

export const associationMembers = pgTable(
  "association_members",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id),
    userId: text("user_id").references(() => user.id),
    fullName: text("full_name").notNull(),
    phoneNumber: text("phone_number").notNull(),
    email: text("email"),
    dateOfBirth: date("date_of_birth"),
    profession: text("profession"),
    notes: text("notes"),
    role: text("role").notNull().default("membre"),
    customRole: text("custom_role"),
    status: text("status").notNull().default("actif"),
    joinedAt: date("joined_at").notNull().default(sql`CURRENT_DATE`),
    leftAt: date("left_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("association_members_org_status_idx")
      .on(table.organizationId, table.status)
      .where(sql`deleted_at IS NULL`),
    index("association_members_user_idx")
      .on(table.userId)
      .where(sql`user_id IS NOT NULL AND deleted_at IS NULL`),
    // Un user ne peut être lié qu'une fois par organisation
    uniqueIndex("association_members_org_user_uidx")
      .on(table.organizationId, table.userId)
      .where(sql`user_id IS NOT NULL AND deleted_at IS NULL`),
  ]
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const pendingInvitationsRelations = relations(
  pendingInvitations,
  ({ one }) => ({
    organization: one(organization, {
      fields: [pendingInvitations.organizationId],
      references: [organization.id],
    }),
    invitedBy: one(user, {
      fields: [pendingInvitations.invitedByUserId],
      references: [user.id],
    }),
  })
);

export const organizationInviteLinksRelations = relations(
  organizationInviteLinks,
  ({ one }) => ({
    organization: one(organization, {
      fields: [organizationInviteLinks.organizationId],
      references: [organization.id],
    }),
    createdBy: one(user, {
      fields: [organizationInviteLinks.createdByUserId],
      references: [user.id],
    }),
  })
);

export const associationMembersRelations = relations(
  associationMembers,
  ({ one }) => ({
    organization: one(organization, {
      fields: [associationMembers.organizationId],
      references: [organization.id],
    }),
    user: one(user, {
      fields: [associationMembers.userId],
      references: [user.id],
    }),
  })
);
