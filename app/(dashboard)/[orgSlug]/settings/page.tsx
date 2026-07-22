import { getTranslations } from "next-intl/server";

import { requireOrgAccess } from "@/lib/auth/org";
import { getOrganizationSettings } from "@/lib/settings/queries";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrganizationSettingsForm } from "@/components/settings/organization-settings-form";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const { organizationId } = await requireOrgAccess(orgSlug);

  const [t, organizationSettings] = await Promise.all([
    getTranslations("settings"),
    getOrganizationSettings(organizationId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Tabs defaultValue="organization">
        <TabsList>
          <TabsTrigger value="organization">{t("tabs.organization")}</TabsTrigger>
          <TabsTrigger value="profile">{t("tabs.profile")}</TabsTrigger>
        </TabsList>

        <TabsContent value="organization" className="pt-4">
          <OrganizationSettingsForm
            orgSlug={orgSlug}
            defaultValues={{
              name: organizationSettings?.name ?? "",
              type: organizationSettings?.type ?? null,
            }}
          />
        </TabsContent>

        <TabsContent value="profile" className="pt-4">
          {/* Chantier 3 */}
        </TabsContent>
      </Tabs>
    </div>
  );
}
