CREATE TABLE "association_members" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text,
	"full_name" text NOT NULL,
	"phone_number" text NOT NULL,
	"email" text,
	"date_of_birth" date,
	"profession" text,
	"notes" text,
	"role" text DEFAULT 'membre' NOT NULL,
	"custom_role" text,
	"status" text DEFAULT 'actif' NOT NULL,
	"joined_at" date DEFAULT CURRENT_DATE NOT NULL,
	"left_at" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "organization_invite_links" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"token" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"acceptance_mode" text DEFAULT 'manual' NOT NULL,
	"default_role" text DEFAULT 'membre' NOT NULL,
	"expires_at" timestamp,
	"max_uses" integer,
	"uses_count" integer DEFAULT 0 NOT NULL,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "organization_invite_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "pending_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"full_name" text NOT NULL,
	"phone_number" text,
	"email" text NOT NULL,
	"intended_role" text DEFAULT 'membre' NOT NULL,
	"token" text NOT NULL,
	"invited_by_user_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"declined_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "pending_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "cotisation_types" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"default_amount" bigint NOT NULL,
	"frequency" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"auto_generate" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "cotisations" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"cotisation_type_id" text NOT NULL,
	"member_id" text NOT NULL,
	"due_amount" bigint NOT NULL,
	"period_label" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"due_date" date NOT NULL,
	"status" text DEFAULT 'en_attente' NOT NULL,
	"paid_amount" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "payment_reminders" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"cotisation_id" text NOT NULL,
	"member_id" text NOT NULL,
	"sent_by_user_id" text NOT NULL,
	"channel" text DEFAULT 'email' NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"delivered_at" timestamp,
	"failed_at" timestamp,
	"failure_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"cotisation_id" text NOT NULL,
	"member_id" text NOT NULL,
	"recorded_by_user_id" text NOT NULL,
	"amount" bigint NOT NULL,
	"paid_at" date DEFAULT CURRENT_DATE NOT NULL,
	"payment_method" text NOT NULL,
	"payment_reference" text,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "meeting_attendance" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"meeting_id" text NOT NULL,
	"member_id" text NOT NULL,
	"rsvp_status" text DEFAULT 'no_response' NOT NULL,
	"rsvp_at" timestamp,
	"attended" boolean,
	"attendance_recorded_at" timestamp,
	"attendance_recorded_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"scheduled_at" timestamp NOT NULL,
	"duration_minutes" integer,
	"location" text,
	"status" text DEFAULT 'planifiee' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "minutes" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"meeting_id" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"agenda" text,
	"decisions_summary" text,
	"actions_to_follow" text,
	"body_markdown" text NOT NULL,
	"status" text DEFAULT 'brouillon' NOT NULL,
	"published_at" timestamp,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"recorded_by_user_id" text NOT NULL,
	"type" text NOT NULL,
	"amount" bigint NOT NULL,
	"occurred_at" date DEFAULT CURRENT_DATE NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"payment_id" text,
	"reference_document" text,
	"status" text DEFAULT 'validated' NOT NULL,
	"validated_by_user_id" text,
	"validated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "association_members" ADD CONSTRAINT "association_members_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "association_members" ADD CONSTRAINT "association_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invite_links" ADD CONSTRAINT "organization_invite_links_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invite_links" ADD CONSTRAINT "organization_invite_links_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_invitations" ADD CONSTRAINT "pending_invitations_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_invitations" ADD CONSTRAINT "pending_invitations_invited_by_user_id_user_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cotisation_types" ADD CONSTRAINT "cotisation_types_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cotisations" ADD CONSTRAINT "cotisations_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cotisations" ADD CONSTRAINT "cotisations_cotisation_type_id_cotisation_types_id_fk" FOREIGN KEY ("cotisation_type_id") REFERENCES "public"."cotisation_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cotisations" ADD CONSTRAINT "cotisations_member_id_association_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."association_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_reminders" ADD CONSTRAINT "payment_reminders_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_reminders" ADD CONSTRAINT "payment_reminders_cotisation_id_cotisations_id_fk" FOREIGN KEY ("cotisation_id") REFERENCES "public"."cotisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_reminders" ADD CONSTRAINT "payment_reminders_member_id_association_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."association_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_reminders" ADD CONSTRAINT "payment_reminders_sent_by_user_id_user_id_fk" FOREIGN KEY ("sent_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_cotisation_id_cotisations_id_fk" FOREIGN KEY ("cotisation_id") REFERENCES "public"."cotisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_member_id_association_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."association_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_user_id_user_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_attendance" ADD CONSTRAINT "meeting_attendance_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_attendance" ADD CONSTRAINT "meeting_attendance_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_attendance" ADD CONSTRAINT "meeting_attendance_member_id_association_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."association_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_attendance" ADD CONSTRAINT "meeting_attendance_attendance_recorded_by_user_id_user_id_fk" FOREIGN KEY ("attendance_recorded_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "minutes" ADD CONSTRAINT "minutes_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "minutes" ADD CONSTRAINT "minutes_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "minutes" ADD CONSTRAINT "minutes_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recorded_by_user_id_user_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_validated_by_user_id_user_id_fk" FOREIGN KEY ("validated_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "association_members_org_status_idx" ON "association_members" USING btree ("organization_id","status") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "association_members_user_idx" ON "association_members" USING btree ("user_id") WHERE user_id IS NOT NULL AND deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "association_members_org_user_uidx" ON "association_members" USING btree ("organization_id","user_id") WHERE user_id IS NOT NULL AND deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "invite_links_org_idx" ON "organization_invite_links" USING btree ("organization_id") WHERE revoked_at IS NULL AND deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "pending_invitations_org_idx" ON "pending_invitations" USING btree ("organization_id","accepted_at","declined_at") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "cotisation_types_org_idx" ON "cotisation_types" USING btree ("organization_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "cotisations_org_status_idx" ON "cotisations" USING btree ("organization_id","status") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "cotisations_member_idx" ON "cotisations" USING btree ("member_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "cotisations_due_date_idx" ON "cotisations" USING btree ("organization_id","due_date") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "reminders_cotisation_idx" ON "payment_reminders" USING btree ("cotisation_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "reminders_member_sent_idx" ON "payment_reminders" USING btree ("member_id","sent_at") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "payments_cotisation_idx" ON "payments" USING btree ("cotisation_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "payments_org_date_idx" ON "payments" USING btree ("organization_id","paid_at") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "payments_member_idx" ON "payments" USING btree ("member_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "meeting_attendance_unique_idx" ON "meeting_attendance" USING btree ("meeting_id","member_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "attendance_meeting_idx" ON "meeting_attendance" USING btree ("meeting_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "attendance_member_idx" ON "meeting_attendance" USING btree ("member_id","created_at") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "meetings_org_scheduled_idx" ON "meetings" USING btree ("organization_id","scheduled_at") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "meetings_org_status_idx" ON "meetings" USING btree ("organization_id","status") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "minutes_meeting_idx" ON "minutes" USING btree ("meeting_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "minutes_org_status_idx" ON "minutes" USING btree ("organization_id","status") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "minutes_org_published_idx" ON "minutes" USING btree ("organization_id","published_at") WHERE deleted_at IS NULL AND status = 'publie';--> statement-breakpoint
CREATE INDEX "transactions_org_type_date_idx" ON "transactions" USING btree ("organization_id","type","occurred_at") WHERE deleted_at IS NULL AND status = 'validated';--> statement-breakpoint
CREATE INDEX "transactions_org_category_idx" ON "transactions" USING btree ("organization_id","category") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "transactions_payment_idx" ON "transactions" USING btree ("payment_id") WHERE payment_id IS NOT NULL AND deleted_at IS NULL;