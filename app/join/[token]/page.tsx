import { getLocale, getTranslations } from "next-intl/server";

import {
  getInviteLinkByToken,
  parseOrganizationType,
} from "@/lib/invitations/queries";
import {
  isInviteLinkAcceptanceMode,
  resolveInviteLinkPageState,
} from "@/lib/invitations/constants";
import { isMemberRole } from "@/lib/members/constants";
import { InviteLinkAcceptCard } from "@/components/invitations/invite-link-accept-card";
import { InvitationErrorState } from "@/components/invitations/invitation-error-state";

/**
 * Route publique de consommation du lien d'invitation partageable (volet 4
 * de la 4B, checkpoint 1 : états en lecture seule uniquement — le lien n'a
 * pas encore de bouton "Rejoindre" fonctionnel, ajouté au checkpoint 2). Le
 * `token` est la seule clé d'autorisation : pas de `requireOrgAccess`, pas
 * d'`orgSlug` dans l'URL — voir `getInviteLinkByToken`.
 */
export default async function JoinInviteLinkPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const [data, t, tOnboarding, tMembers, locale] = await Promise.all([
    getInviteLinkByToken(token),
    getTranslations("invitations.join"),
    getTranslations("onboarding"),
    getTranslations("members"),
    getLocale(),
  ]);

  const state = resolveInviteLinkPageState(data);

  if (state === "notFound") {
    return (
      <InvitationErrorState
        title={t("errors.notFound.title")}
        description={t("errors.notFound.description")}
      />
    );
  }

  // Toujours vrai passé ce point : seul l'état "notFound" a `data === null`.
  const { link, organization } = data!;

  if (state === "orgDeleted") {
    return (
      <InvitationErrorState
        title={t("errors.orgDeleted.title")}
        description={t("errors.orgDeleted.description")}
      />
    );
  }

  if (state === "revoked") {
    return (
      <InvitationErrorState
        title={t("errors.revoked.title")}
        description={t("errors.revoked.description")}
      />
    );
  }

  if (state === "expired") {
    const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "long" });
    return (
      <InvitationErrorState
        title={t("errors.expired.title")}
        description={t("errors.expired.description", {
          // `expired` implique `expiresAt` non nul (cf. resolveInviteLinkPageState).
          date: dateFormatter.format(link.expiresAt!),
        })}
      />
    );
  }

  if (state === "exhausted") {
    return (
      <InvitationErrorState
        title={t("errors.exhausted.title")}
        description={t("errors.exhausted.description")}
      />
    );
  }

  // state === "active" — cas nominal.
  const organizationName = organization!.name;
  const organizationType = parseOrganizationType(organization!.metadata);
  const roleLabel = isMemberRole(link.defaultRole)
    ? tMembers(`roles.${link.defaultRole}`)
    : link.defaultRole;
  const acceptanceMode = isInviteLinkAcceptanceMode(link.acceptanceMode)
    ? link.acceptanceMode
    : "auto";

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold text-foreground">
          {t("title", { orgName: organizationName })}
        </h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <InviteLinkAcceptCard
        organizationName={organizationName}
        organizationTypeLabel={
          organizationType ? tOnboarding(`orgTypes.${organizationType}`) : null
        }
        roleLabelText={t("roleLabel")}
        roleLabel={roleLabel}
        modeNote={t(`modeNote.${acceptanceMode}`)}
      />
    </div>
  );
}
