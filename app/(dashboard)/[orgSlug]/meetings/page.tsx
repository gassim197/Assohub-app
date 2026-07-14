import { Plus } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { requireOrgAccess } from "@/lib/auth/org";
import {
  getMeetingById,
  listMeetingDatesForCalendar,
  listPastMeetings,
  listUpcomingMeetings,
} from "@/lib/meetings/queries";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MeetingsListTab } from "@/components/meetings/meetings-list-tab";
import { MeetingFormDialog } from "@/components/meetings/meeting-form-dialog";
import { MeetingsCalendar } from "@/components/meetings/meetings-calendar";
import { MeetingsKpis } from "@/components/meetings/meetings-kpis";

type SearchParams = Record<string, string | string[] | undefined>;

function readParam(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export default async function MeetingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const { organizationId } = await requireOrgAccess(orgSlug);

  const t = await getTranslations("meetings");

  const day = readParam(sp.day);

  const [upcoming, past, calendarDates, kpiUpcoming, kpiPast] = await Promise.all([
    listUpcomingMeetings({ organizationId, day }),
    listPastMeetings({ organizationId, day }),
    listMeetingDatesForCalendar(organizationId),
    // Non filtrées par `day` : le bandeau de KPI reste global même quand le
    // calendrier restreint les deux onglets à une date (filtre additif).
    listUpcomingMeetings({ organizationId }),
    listPastMeetings({ organizationId }),
  ]);

  // Édition en place : `?editMeeting=true&meetingId=X` monte la modale pré-remplie.
  const editMeetingId =
    sp.editMeeting === "true" ? readParam(sp.meetingId) : undefined;
  const editMeeting = editMeetingId
    ? await getMeetingById(organizationId, editMeetingId)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button
          size="sm"
          render={<Link href={`/${orgSlug}/meetings?newMeeting=true`} />}
        >
          <Plus />
          {t("schedule")}
        </Button>
      </div>

      <MeetingsKpis upcoming={kpiUpcoming} past={kpiPast} />

      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming">{t("upcoming")}</TabsTrigger>
            <TabsTrigger value="past">{t("past")}</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="pt-4">
            <MeetingsListTab
              orgSlug={orgSlug}
              meetings={upcoming}
              emptyTitle={t("empty.upcomingTitle")}
              emptyDescription={t("empty.upcomingDescription")}
              showCreateCta
            />
          </TabsContent>

          <TabsContent value="past" className="pt-4">
            <MeetingsListTab
              orgSlug={orgSlug}
              meetings={past}
              emptyTitle={t("empty.pastTitle")}
              emptyDescription={t("empty.pastDescription")}
            />
          </TabsContent>
        </Tabs>

        <MeetingsCalendar dates={calendarDates} />
      </div>

      <MeetingFormDialog orgSlug={orgSlug} />
      {editMeeting ? (
        <MeetingFormDialog orgSlug={orgSlug} meeting={editMeeting} />
      ) : null}
    </div>
  );
}
