import { getTranslations } from "next-intl/server";

import { requireOrgAccess } from "@/lib/auth/org";
import {
  getOrganizationSettings,
  getUserProfile,
  hasCredentialAccount,
} from "@/lib/settings/queries";
import {
  getMemberRole,
  getOrganizationDeletionStats,
  getUserSoleOwnedOrganizations,
} from "@/lib/organizations/queries";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrganizationSettingsForm } from "@/components/settings/organization-settings-form";
import { OrganizationDangerZone } from "@/components/settings/organization-danger-zone";
import { ProfileSettingsForm } from "@/components/settings/profile-settings-form";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { SetPasswordForm } from "@/components/settings/set-password-form";
import { DangerZone } from "@/components/settings/danger-zone";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const { organizationId, userId } = await requireOrgAccess(orgSlug);

  const [t, organizationSettings, userProfile, hasPassword, soleOwnedOrganizations, role] =
    await Promise.all([
      getTranslations("settings"),
      getOrganizationSettings(organizationId),
      getUserProfile(userId),
      hasCredentialAccount(userId),
      getUserSoleOwnedOrganizations(userId),
      getMemberRole(organizationId, userId),
    ]);

  const isOwner = role === "owner";
  const deletionStats = isOwner
    ? await getOrganizationDeletionStats(organizationId, userId)
    : null;

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

        <TabsContent value="organization" className="space-y-6 pt-4">
          <OrganizationSettingsForm
            orgSlug={orgSlug}
            defaultValues={{
              name: organizationSettings?.name ?? "",
              type: organizationSettings?.type ?? null,
            }}
          />
          {isOwner && deletionStats ? (
            <OrganizationDangerZone
              orgSlug={orgSlug}
              organizationName={organizationSettings?.name ?? ""}
              stats={deletionStats}
            />
          ) : null}
        </TabsContent>

        <TabsContent value="profile" className="space-y-6 pt-4">
          <ProfileSettingsForm
            orgSlug={orgSlug}
            defaultValues={{
              name: userProfile?.name ?? "",
              email: userProfile?.email ?? "",
            }}
          />
          {hasPassword ? (
            <ChangePasswordForm orgSlug={orgSlug} />
          ) : (
            <SetPasswordForm orgSlug={orgSlug} />
          )}
          <DangerZone orgSlug={orgSlug} soleOwnedOrganizations={soleOwnedOrganizations} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
