import type { ReactNode } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";

import { auth } from "@/lib/auth";
import {
  findAssociationMemberByUser,
  getInviteLinkByToken,
  parseOrganizationType,
} from "@/lib/invitations/queries";
import {
  isInviteLinkAcceptanceMode,
  resolveInviteLinkPageState,
} from "@/lib/invitations/constants";
import { isMemberRole } from "@/lib/members/constants";
import { AlreadyMemberNotice } from "@/components/invitations/already-member-notice";
import { InviteLinkAcceptCard } from "@/components/invitations/invite-link-accept-card";
import { InvitationErrorState } from "@/components/invitations/invitation-error-state";
import { JoinViaLinkButton } from "@/components/invitations/join-via-link-button";
import { RegisterViaLinkForm } from "@/components/invitations/register-via-link-form";

/**
 * Route publique de consommation du lien d'invitation partageable (volet 4
 * de la 4B). Le `token` est la seule clé d'autorisation : pas de
 * `requireOrgAccess`, pas d'`orgSlug` dans l'URL — voir `getInviteLinkByToken`.
 */
export default async function JoinInviteLinkPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const [data, session, t, tAuth, tOnboarding, tMembers, locale] = await Promise.all([
    getInviteLinkByToken(token),
    auth.api.getSession({ headers: await headers() }),
    getTranslations("invitations.join"),
    getTranslations("auth"),
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
  const org = organization!;
  const organizationName = org.name;
  const organizationType = parseOrganizationType(org.metadata);
  const roleLabel = isMemberRole(link.defaultRole)
    ? tMembers(`roles.${link.defaultRole}`)
    : link.defaultRole;
  const acceptanceMode = isInviteLinkAcceptanceMode(link.acceptanceMode)
    ? link.acceptanceMode
    : "auto";

  const existingMembership = session
    ? await findAssociationMemberByUser(org.id, session.user.id)
    : null;

  // Déjà membre actif : rien à faire ici, accès direct au tableau de bord
  // (brief 4B volet 4, point A) — jamais un message d'erreur, pas de doublon
  // possible en base.
  if (existingMembership?.status === "actif") {
    return (
      <AlreadyMemberNotice orgSlug={org.slug} organizationName={organizationName} />
    );
  }

  // Demande déjà soumise (mode manuel) : pas de nouveau bouton, juste un
  // rappel à la place de la note habituelle sur le mode d'acceptation.
  const modeNote = existingMembership
    ? t("alreadyPending", { orgName: organizationName })
    : t(`modeNote.${acceptanceMode}`);

  let primaryAction: ReactNode = null;
  if (!existingMembership && session) {
    primaryAction = <JoinViaLinkButton token={token} />;
  }

  const showRegisterForm = !session && !existingMembership;

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
        modeNote={modeNote}
        primaryAction={primaryAction}
      />

      {showRegisterForm && (
        <>
          <RegisterViaLinkForm token={token} />
          <p className="text-sm text-muted-foreground">
            {tAuth("alreadyHaveAccount")}{" "}
            <Link
              href={`/login?redirect=${encodeURIComponent(`/join/${token}`)}`}
              className="underline underline-offset-4"
            >
              {tAuth("signIn")}
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
