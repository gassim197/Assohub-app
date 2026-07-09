import { getTranslations } from "next-intl/server";

import { requireOrgAccess } from "@/lib/auth/org";
import { ensureCotisationsGenerated } from "@/lib/cotisations/generation";
import {
  getCotisationKpis,
  getCotisationTypeById,
  getCotisationTypes,
  listCotisationsDue,
  listRecentCotisations,
  type DueStatusFilter,
} from "@/lib/cotisations/queries";
import type { DuePeriodFilter } from "@/lib/cotisations/queries";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CotisationTypesTab } from "@/components/cotisations/cotisation-types-tab";
import { CotisationTypeFormDialog } from "@/components/cotisations/cotisation-type-form-dialog";
import { CotisationsOverview } from "@/components/cotisations/cotisations-overview";
import { CotisationsDueTab } from "@/components/cotisations/cotisations-due-tab";

type SearchParams = Record<string, string | string[] | undefined>;

function readParam(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

const DUE_STATUS_VALUES: readonly DueStatusFilter[] = ["all", "en_attente", "en_retard"];
const DUE_PERIOD_VALUES: readonly DuePeriodFilter[] = ["current", "last", "custom"];

function parseDueStatus(value: string | undefined): DueStatusFilter {
  return DUE_STATUS_VALUES.includes(value as DueStatusFilter)
    ? (value as DueStatusFilter)
    : "all";
}

function parseDuePeriod(value: string | undefined): DuePeriodFilter | undefined {
  return DUE_PERIOD_VALUES.includes(value as DuePeriodFilter)
    ? (value as DuePeriodFilter)
    : undefined;
}

export default async function CotisationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const { organizationId } = await requireOrgAccess(orgSlug);

  // Génération lazy : crée les cotisations manquantes de la période courante
  // pour les types récurrents actifs, avant tout fetch (5A §2).
  await ensureCotisationsGenerated(organizationId);

  const t = await getTranslations("cotisations");

  const dueParams = {
    organizationId,
    status: parseDueStatus(readParam(sp.status)),
    period: parseDuePeriod(readParam(sp.period)),
    periodFrom: readParam(sp.periodFrom),
    periodTo: readParam(sp.periodTo),
    search: readParam(sp.search),
    typeId: readParam(sp.typeId),
    page: Math.max(1, Number(readParam(sp.page)) || 1),
  };

  const [types, kpis, recent, dueResult] = await Promise.all([
    getCotisationTypes(organizationId),
    getCotisationKpis(organizationId),
    listRecentCotisations(organizationId),
    listCotisationsDue(dueParams),
  ]);

  // Édition en place : `?editType=true&typeId=X` monte la modal pré-remplie.
  const editTypeId = sp.editType === "true" ? readParam(sp.typeId) : undefined;
  const editType = editTypeId
    ? await getCotisationTypeById(organizationId, editTypeId)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
          <TabsTrigger value="due">{t("tabs.due")}</TabsTrigger>
          <TabsTrigger value="types">{t("tabs.types")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-4">
          <CotisationsOverview
            orgSlug={orgSlug}
            types={types}
            kpis={kpis}
            recent={recent}
          />
        </TabsContent>

        <TabsContent value="due" className="pt-4">
          <CotisationsDueTab orgSlug={orgSlug} types={types} result={dueResult} />
        </TabsContent>

        <TabsContent value="types" className="pt-4">
          <CotisationTypesTab orgSlug={orgSlug} types={types} />
        </TabsContent>
      </Tabs>

      <CotisationTypeFormDialog orgSlug={orgSlug} />
      {editType ? (
        <CotisationTypeFormDialog orgSlug={orgSlug} type={editType} />
      ) : null}
    </div>
  );
}
