import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Video } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { requireOrgAccess } from "@/lib/auth/org";
import { getMeetingById } from "@/lib/meetings/queries";
import {
  MEETING_STATUS_BADGE_VARIANT,
  MEETING_TYPE_BADGE_VARIANT,
  isMeetingStatus,
  isMeetingType,
} from "@/lib/meetings/constants";
import { formatMeetingDateTime } from "@/lib/meetings/date";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MeetingAttendanceSection } from "@/components/meetings/meeting-attendance-section";
import { MeetingDetailActions } from "@/components/meetings/meeting-detail-actions";
import { MeetingFormDialog } from "@/components/meetings/meeting-form-dialog";
import { MeetingMinutesSection } from "@/components/meetings/meeting-minutes-section";

/** Ligne libellé / valeur d'une section de la fiche. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-2 sm:grid-cols-[200px_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; meetingId: string }>;
}) {
  const { orgSlug, meetingId } = await params;
  const { organizationId } = await requireOrgAccess(orgSlug);

  // getMeetingById est borné au tenant et exclut les supprimées : une réunion
  // d'une autre organisation (ou soft-deleted) renvoie null → 404 propre. Une
  // réunion « annulée » reste accessible ici, via lien direct uniquement.
  const meeting = await getMeetingById(organizationId, meetingId);
  if (!meeting) {
    notFound();
  }

  const [t, locale] = await Promise.all([
    getTranslations("meetings"),
    getLocale(),
  ]);

  const type = isMeetingType(meeting.type) ? meeting.type : null;
  const typeLabel = type ? t(`types.${type}`) : meeting.type;
  const typeVariant = type ? MEETING_TYPE_BADGE_VARIANT[type] : "outline";

  const status = isMeetingStatus(meeting.status) ? meeting.status : null;
  const statusLabel = status ? t(`status.${status}`) : meeting.status;
  const statusVariant = status ? MEETING_STATUS_BADGE_VARIANT[status] : "outline";

  const notProvided = (
    <span className="text-muted-foreground">{t("detail.notProvided")}</span>
  );

  return (
    <div className="space-y-6">
      {/* Fil d'Ariane / retour */}
      <Button
        variant="ghost"
        size="sm"
        render={<Link href={`/${orgSlug}/meetings`} />}
      >
        <ArrowLeft />
        {t("detail.backToList")}
      </Button>

      {/* En-tête : identité + actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {meeting.title}
            </h1>
            <Badge variant={typeVariant}>{typeLabel}</Badge>
            <Badge variant={statusVariant}>{statusLabel}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatMeetingDateTime(meeting.scheduledAt, locale)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {meeting.videoLink ? (
            <Button
              variant="outline"
              size="sm"
              render={
                <a
                  href={meeting.videoLink}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              <Video />
              {t("join")}
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            render={
              <Link href={`/${orgSlug}/meetings/${meeting.id}?editMeeting=true`} />
            }
          >
            <Pencil />
            {t("detail.edit")}
          </Button>
          <MeetingDetailActions
            orgSlug={orgSlug}
            meeting={{ id: meeting.id, title: meeting.title, status: meeting.status }}
          />
        </div>
      </div>

      {/* Détail en mode lecture */}
      <Card>
        <CardContent className="space-y-6">
          <section>
            <h2 className="text-sm font-semibold text-foreground">
              {t("detail.sectionSchedule")}
            </h2>
            <Separator className="mt-2" />
            <dl className="mt-2 divide-y divide-border">
              <Field label={t("detail.duration")}>
                {meeting.durationMinutes
                  ? t("durationLabel", { minutes: meeting.durationMinutes })
                  : notProvided}
              </Field>
              <Field label={t("detail.location")}>
                {meeting.location ?? notProvided}
              </Field>
              <Field label={t("detail.videoLink")}>
                {meeting.videoLink ? (
                  <a
                    href={meeting.videoLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    {meeting.videoLink}
                  </a>
                ) : (
                  notProvided
                )}
              </Field>
            </dl>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-foreground">
              {t("detail.sectionDescription")}
            </h2>
            <Separator className="mt-2" />
            <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
              {meeting.description?.trim() ? (
                meeting.description
              ) : (
                <span className="text-muted-foreground">
                  {t("detail.descriptionEmpty")}
                </span>
              )}
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-foreground">
              {t("detail.attendanceTitle")}
            </h2>
            <Separator className="mt-2" />
            <div className="mt-2">
              <MeetingAttendanceSection
                orgSlug={orgSlug}
                organizationId={organizationId}
                meetingId={meeting.id}
                meetingStatus={meeting.status}
                meetingScheduledAt={meeting.scheduledAt}
              />
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-foreground">
              {t("detail.minutesTitle")}
            </h2>
            <Separator className="mt-2" />
            <div className="mt-2">
              <MeetingMinutesSection
                orgSlug={orgSlug}
                organizationId={organizationId}
                meetingId={meeting.id}
                meetingDescription={meeting.description}
              />
            </div>
          </section>
        </CardContent>
      </Card>

      {/* Modal d'édition, pilotée par ?editMeeting=true */}
      <MeetingFormDialog orgSlug={orgSlug} meeting={meeting} />
    </div>
  );
}
