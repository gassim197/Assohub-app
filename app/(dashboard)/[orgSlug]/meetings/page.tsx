import { getTranslations } from "next-intl/server";

import { requireOrgAccess } from "@/lib/auth/org";
import { listPastMeetings, listUpcomingMeetings } from "@/lib/meetings/queries";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MeetingsListTab } from "@/components/meetings/meetings-list-tab";

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

  const [upcoming, past] = await Promise.all([
    listUpcomingMeetings({ organizationId, day }),
    listPastMeetings({ organizationId, day }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">{t("upcoming")}</TabsTrigger>
          <TabsTrigger value="past">{t("past")}</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="pt-4">
          <MeetingsListTab
            meetings={upcoming}
            emptyTitle={t("empty.upcomingTitle")}
            emptyDescription={t("empty.upcomingDescription")}
          />
        </TabsContent>

        <TabsContent value="past" className="pt-4">
          <MeetingsListTab
            meetings={past}
            emptyTitle={t("empty.pastTitle")}
            emptyDescription={t("empty.pastDescription")}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
