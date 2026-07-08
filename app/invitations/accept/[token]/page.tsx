import type { ReactNode } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";

import { auth } from "@/lib/auth";
import {
  findUserIdByEmail,
  getInvitationByToken,
  parseOrganizationType,
} from "@/lib/invitations/queries";
import { resolveAcceptPageState } from "@/lib/invitations/constants";
import { isMemberRole } from "@/lib/members/constants";
import { Button } from "@/components/ui/button";
import { AcceptInvitationCard } from "@/components/invitations/accept-invitation-card";
import { DeclineInvitationDialog } from "@/components/invitations/decline-invitation-dialog";
import { InvitationErrorState } from "@/components/invitations/invitation-error-state";
import { JoinOrganizationButton } from "@/components/invitations/join-organization-button";
import { SessionMismatchNotice } from "@/components/invitations/session-mismatch-notice";

/**
 * Route publique d'acceptation d'invitation (volet 2 de la 4B). Le `token`
 * (43 caractères imprévisibles) est la seule clé d'autorisation — pas de
 * `requireOrgAccess`, pas d'`orgSlug` dans l'URL : voir
 * `getInvitationByToken`.
 */
export default async function AcceptInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const [data, session, t, tOnboarding, tMembers, locale] = await Promise.all([
    getInvitationByToken(token),
    auth.api.getSession({ headers: await headers() }),
    getTranslations("invitations.accept"),
    getTranslations("onboarding"),
    getTranslations("members"),
    getLocale(),
  ]);

  const state = resolveAcceptPageState(data);

  if (state === "notFound") {
    return (
      <InvitationErrorState
        title={t("errors.notFound.title")}
        description={t("errors.notFound.description")}
      />
    );
  }

  // Toujours vrai passé ce point : seul l'état "notFound" a `data === null`.
  const { invitation, organization, inviterName } = data!;
  const inviter = inviterName ?? "";

  if (state === "orgDeleted") {
    return (
      <InvitationErrorState
        title={t("errors.orgDeleted.title")}
        description={t("errors.orgDeleted.description")}
      />
    );
  }

  if (state === "expired") {
    const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "long" });
    return (
      <InvitationErrorState
        title={t("errors.expired.title")}
        description={t("errors.expired.description", {
          date: dateFormatter.format(invitation.expiresAt),
          inviterName: inviter,
        })}
      />
    );
  }

  if (state === "accepted") {
    return (
      <InvitationErrorState
        title={t("errors.accepted.title")}
        description={t("errors.accepted.description")}
        cta={{ label: t("errors.accepted.cta"), href: "/login" }}
      />
    );
  }

  if (state === "declined") {
    return (
      <InvitationErrorState
        title={t("errors.declined.title")}
        description={t("errors.declined.description", { inviterName: inviter })}
      />
    );
  }

  // state === "pending" — cas nominal.
  const organizationName = organization!.name;
  const organizationType = parseOrganizationType(organization!.metadata);
  const roleLabel = isMemberRole(invitation.intendedRole)
    ? tMembers(`roles.${invitation.intendedRole}`)
    : invitation.intendedRole;

  const heading = (
    <div className="space-y-1.5">
      <h1 className="text-xl font-semibold text-foreground">
        {t("title", { orgName: organizationName })}
      </h1>
      <p className="text-sm text-muted-foreground">
        {t("subtitle", { inviterName: inviter })}
      </p>
    </div>
  );

  // Visiteur déjà connecté, mais pas avec le compte invité : pas de
  // rattachement possible tant qu'il n'a pas changé de session (checkpoint
  // 3a — cas non prévu littéralement par le brief mais nécessaire).
  if (session && session.user.email !== invitation.email) {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        {heading}
        <SessionMismatchNotice
          sessionEmail={session.user.email}
          invitationEmail={invitation.email}
        />
      </div>
    );
  }

  // CTA intelligent (checkpoint 1 : inscription vs connexion ; checkpoint 3a :
  // déjà connecté avec le bon compte → rejoindre directement, sans
  // repasser par /login).
  let primaryAction: ReactNode;
  if (session) {
    primaryAction = <JoinOrganizationButton token={token} />;
  } else {
    const existingUserId = await findUserIdByEmail(invitation.email);
    primaryAction = existingUserId ? (
      <Button
        className="w-full"
        render={
          <Link
            href={`/login?redirect=${encodeURIComponent(
              `/invitations/accept/${token}`,
            )}&email=${encodeURIComponent(invitation.email)}`}
          />
        }
      >
        {t("cta.loginAndJoin")}
      </Button>
    ) : (
      <Button
        className="w-full"
        render={<Link href={`/invitations/accept/${token}/register`} />}
      >
        {t("cta.registerAndJoin")}
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      {heading}

      <AcceptInvitationCard
        organizationName={organizationName}
        organizationTypeLabel={
          organizationType ? tOnboarding(`orgTypes.${organizationType}`) : null
        }
        roleLabelText={t("roleLabel")}
        roleLabel={roleLabel}
        personalMessage={invitation.personalMessage}
        primaryAction={primaryAction}
        secondaryAction={
          <DeclineInvitationDialog
            token={token}
            organizationName={organizationName}
          />
        }
      />
    </div>
  );
}
