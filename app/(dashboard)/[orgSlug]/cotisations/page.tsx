import { getTranslations } from "next-intl/server";

import { requireOrgAccess } from "@/lib/auth/org";
import { getCotisationTypeById, getCotisationTypes } from "@/lib/cotisations/queries";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CotisationTypesTab } from "@/components/cotisations/cotisation-types-tab";
import { CotisationTypeFormDialog } from "@/components/cotisations/cotisation-type-form-dialog";

type SearchParams = Record<string, string | string[] | undefined>;

function readParam(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
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

  const t = await getTranslations("cotisations");

  const types = await getCotisationTypes(organizationId);

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
          <p className="text-sm text-muted-foreground">
            {t("dashboard.comingSoon")}
          </p>
        </TabsContent>

        <TabsContent value="due" className="pt-4">
          <p className="text-sm text-muted-foreground">
            {t("due.comingSoon")}
          </p>
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
