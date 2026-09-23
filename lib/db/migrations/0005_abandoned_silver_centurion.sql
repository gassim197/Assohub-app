CREATE TABLE "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"uploaded_by_user_id" text NOT NULL,
	"file_name" text NOT NULL,
	"display_name" text NOT NULL,
	"category" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"blob_url" text NOT NULL,
	"blob_pathname" text NOT NULL,
	"payment_id" text,
	"meeting_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "organization_storage_usage" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"used_bytes" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_user_id_user_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_storage_usage" ADD CONSTRAINT "organization_storage_usage_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "documents_org_category_idx" ON "documents" USING btree ("organization_id","category") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "documents_org_created_idx" ON "documents" USING btree ("organization_id","created_at") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "documents_payment_idx" ON "documents" USING btree ("payment_id") WHERE payment_id IS NOT NULL AND deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "documents_meeting_idx" ON "documents" USING btree ("meeting_id") WHERE meeting_id IS NOT NULL AND deleted_at IS NULL;