import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { getCurrentMinutesForMeeting } from "@/lib/meetings/minutes-queries";
import {
  MINUTES_STATUS_BADGE_VARIANT,
  isMinutesStatus,
} from "@/lib/meetings/minutes-constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MeetingMinutesFormDialog } from "./meeting-minutes-form-dialog";

/** Section de contenu du PV (checkpoint 1 : texte brut, rendu Markdown en checkpoint 2). */
function MinutesField({ label, value }: { label: string; value: string | null }) {
  if (!value?.trim()) return null;
  return (
    <div>
      <h3 className="text-xs font-medium text-muted-foreground">{label}</h3>
      <p className="mt-1 text-sm whitespace-pre-wrap text-foreground">{value}</p>
    </div>
  );
}

/**
 * Server Component : charge le PV courant de la réunion (au plus un
 * non-archivé, cf. `getCurrentMinutesForMeeting`) et affiche soit l'état
 * vide + bouton de création, soit le contenu en lecture + bouton d'édition.
 * La modale de création/édition est pilotée par l'URL (`?newMinutes=true` /
 * `?editMinutes=true`), même patron que `MeetingFormDialog`.
 */
export async function MeetingMinutesSection({
  orgSlug,
  organizationId,
  meetingId,
  meetingDescription,
}: {
  orgSlug: string;
  organizationId: string;
  meetingId: string;
  meetingDescription: string | null;
}) {
  const t = await getTranslations("meetings.minutes");
  const current = await getCurrentMinutesForMeeting(organizationId, meetingId);
  const basePath = `/${orgSlug}/meetings/${meetingId}`;

  if (!current) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
        <Button size="sm" render={<Link href={`${basePath}?newMinutes=true`} />}>
          {t("create")}
        </Button>
        <MeetingMinutesFormDialog
          orgSlug={orgSlug}
          meetingId={meetingId}
          meetingDescription={meetingDescription}
        />
      </div>
    );
  }

  const status = isMinutesStatus(current.status) ? current.status : "brouillon";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Badge variant={MINUTES_STATUS_BADGE_VARIANT[status]}>
          {t(`status.${status}`)}
        </Badge>
        <Button
          size="sm"
          variant="outline"
          render={<Link href={`${basePath}?editMinutes=true`} />}
        >
          {t("edit")}
        </Button>
      </div>

      <div className="space-y-3">
        <MinutesField label={t("fields.agenda")} value={current.agenda} />
        <MinutesField
          label={t("fields.decisionsSummary")}
          value={current.decisionsSummary}
        />
        <MinutesField
          label={t("fields.actionsToFollow")}
          value={current.actionsToFollow}
        />
        <MinutesField label={t("fields.bodyMarkdown")} value={current.bodyMarkdown} />
      </div>

      <MeetingMinutesFormDialog
        orgSlug={orgSlug}
        meetingId={meetingId}
        meetingDescription={meetingDescription}
        minutes={current}
      />
    </div>
  );
}
