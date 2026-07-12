import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organization, user } from "./auth-schema";
import { associationMembers } from "./members-schema";

// ─── meetings ─────────────────────────────────────────────────────────────────
// Réunions planifiées ou passées.
// Enum type : ag | bureau | ca | commission | formation | atelier | evenement | autre
// Enum status : planifiee | tenue | annulee | reportee
//
// IMPORTANT — filtres corrects à utiliser dans les requêtes (session 6A) :
//   Prochaines : scheduled_at >= NOW() AND status IN ('planifiee', 'reportee')
//   Passées    : (scheduled_at < NOW() OR status = 'tenue') AND status != 'annulee'
//                (exclusion explicite d'annulee ajoutée en 6A — le filtre
//                littéral de schema-design.md ne l'excluait pas, corrigé avec
//                confirmation : une réunion annulée n'apparaît dans aucune des
//                deux vues par défaut, seulement via sa page détail)

export const meetings = pgTable(
  "meetings",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id),
    title: text("title").notNull(),
    type: text("type").notNull(),
    description: text("description"),
    scheduledAt: timestamp("scheduled_at").notNull(),
    durationMinutes: integer("duration_minutes"),
    location: text("location"),
    // Ajouté en session 6A (décision produit) : absent du schema-design.md
    // d'origine (§6.1), qui ne prévoyait pas de lien de visioconférence.
    videoLink: text("video_link"),
    status: text("status").notNull().default("planifiee"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("meetings_org_scheduled_idx")
      .on(table.organizationId, table.scheduledAt)
      .where(sql`deleted_at IS NULL`),
    index("meetings_org_status_idx")
      .on(table.organizationId, table.status)
      .where(sql`deleted_at IS NULL`),
  ]
);

// ─── meeting_attendance ───────────────────────────────────────────────────────
// RSVP et présence effective de chaque membre à une réunion.
// Les lignes sont créées à la demande (RSVP ou saisie de présence post-réunion).
// Pas de création automatique à la création d'une réunion.
// Enum rsvp_status : yes | no | maybe | no_response
//
// Contrainte : un membre ne peut apparaître qu'une fois par réunion (hors soft-deleted).
// Implémentée via uniqueIndex partiel plutôt qu'une contrainte UNIQUE sur (meeting_id, member_id, deleted_at)
// qui serait incorrecte en PostgreSQL (NULL != NULL → doublons possibles).

export const meetingAttendance = pgTable(
  "meeting_attendance",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id),
    meetingId: text("meeting_id")
      .notNull()
      .references(() => meetings.id),
    memberId: text("member_id")
      .notNull()
      .references(() => associationMembers.id),
    rsvpStatus: text("rsvp_status").notNull().default("no_response"),
    rsvpAt: timestamp("rsvp_at"),
    attended: boolean("attended"),
    attendanceRecordedAt: timestamp("attendance_recorded_at"),
    attendanceRecordedByUserId: text("attendance_recorded_by_user_id").references(
      () => user.id
    ),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    uniqueIndex("meeting_attendance_unique_idx")
      .on(table.meetingId, table.memberId)
      .where(sql`deleted_at IS NULL`),
    index("attendance_meeting_idx")
      .on(table.meetingId)
      .where(sql`deleted_at IS NULL`),
    index("attendance_member_idx")
      .on(table.memberId, table.createdAt)
      .where(sql`deleted_at IS NULL`),
  ]
);

// ─── minutes ──────────────────────────────────────────────────────────────────
// Procès-verbaux des réunions. Structure hybride : sections fixes + corps Markdown.
// Enum status : brouillon | publie | archive
//
// Règle : un meeting a au plus UN minutes en état non-archivé (contrainte applicative).
// Affichage "Derniers PV" : WHERE status = 'publie' ORDER BY published_at DESC.

export const minutes = pgTable(
  "minutes",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id),
    meetingId: text("meeting_id")
      .notNull()
      .references(() => meetings.id),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id),
    agenda: text("agenda"),
    decisionsSummary: text("decisions_summary"),
    actionsToFollow: text("actions_to_follow"),
    bodyMarkdown: text("body_markdown").notNull(),
    status: text("status").notNull().default("brouillon"),
    publishedAt: timestamp("published_at"),
    archivedAt: timestamp("archived_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("minutes_meeting_idx")
      .on(table.meetingId)
      .where(sql`deleted_at IS NULL`),
    index("minutes_org_status_idx")
      .on(table.organizationId, table.status)
      .where(sql`deleted_at IS NULL`),
    index("minutes_org_published_idx")
      .on(table.organizationId, table.publishedAt)
      .where(sql`deleted_at IS NULL AND status = 'publie'`),
  ]
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const meetingsRelations = relations(meetings, ({ one }) => ({
  organization: one(organization, {
    fields: [meetings.organizationId],
    references: [organization.id],
  }),
  createdBy: one(user, {
    fields: [meetings.createdByUserId],
    references: [user.id],
  }),
}));

export const meetingAttendanceRelations = relations(
  meetingAttendance,
  ({ one }) => ({
    organization: one(organization, {
      fields: [meetingAttendance.organizationId],
      references: [organization.id],
    }),
    meeting: one(meetings, {
      fields: [meetingAttendance.meetingId],
      references: [meetings.id],
    }),
    member: one(associationMembers, {
      fields: [meetingAttendance.memberId],
      references: [associationMembers.id],
    }),
    recordedBy: one(user, {
      fields: [meetingAttendance.attendanceRecordedByUserId],
      references: [user.id],
    }),
  })
);

export const minutesRelations = relations(minutes, ({ one }) => ({
  organization: one(organization, {
    fields: [minutes.organizationId],
    references: [organization.id],
  }),
  meeting: one(meetings, {
    fields: [minutes.meetingId],
    references: [meetings.id],
  }),
  createdBy: one(user, {
    fields: [minutes.createdByUserId],
    references: [user.id],
  }),
}));
