import { getLocale, getTranslations } from "next-intl/server";

import {
  findUserIdByEmail,
  getInvitationByToken,
  parseOrganizationType,
} from "@/lib/invitations/queries";
import { resolveAcceptPageState } from "@/lib/invitations/constants";
import { isMemberRole } from "@/lib/members/constants";
import { AcceptInvitationCard } from "@/components/invitations/accept-invitation-card";
import { InvitationErrorState } from "@/components/invitations/invitation-error-state";

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

  const [data, t, tOnboarding, tMembers, locale] = await Promise.all([
    getInvitationByToken(token),
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

  // CTA intelligent : un compte existe déjà pour cet email → connexion,
  // sinon → inscription. La page `/register` du volet 2 (checkpoint 2)
  // n'existe pas encore : le lien est prêt, la page arrive au prochain
  // checkpoint.
  const existingUserId = await findUserIdByEmail(invitation.email);
  const primaryCta = existingUserId
    ? {
        label: t("cta.loginAndJoin"),
        href: `/login?redirect=${encodeURIComponent(
          `/invitations/accept/${token}`,
        )}&email=${encodeURIComponent(invitation.email)}`,
      }
    : {
        label: t("cta.registerAndJoin"),
        href: `/invitations/accept/${token}/register`,
      };

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold text-foreground">
          {t("title", { orgName: organizationName })}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("subtitle", { inviterName: inviter })}
        </p>
      </div>

      <AcceptInvitationCard
        organizationName={organizationName}
        organizationTypeLabel={
          organizationType ? tOnboarding(`orgTypes.${organizationType}`) : null
        }
        roleLabelText={t("roleLabel")}
        roleLabel={roleLabel}
        personalMessage={invitation.personalMessage}
        primaryCta={primaryCta}
      />
    </div>
  );
}
