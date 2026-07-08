import { getLocale } from "next-intl/server";

import type { OrganizationInviteLinkRow } from "@/lib/invitations/queries";
import { getAppUrl } from "@/lib/url";
import { InviteLinkCard } from "./invite-link-card";
import { InviteLinkEmptyState } from "./invite-link-empty-state";

/**
 * Contenu de l'onglet "Lien d'invitation" (volet 3 de la 4B, checkpoint 1).
 * Server Component : `activeLink` est déjà chargé par la page parente
 * (`requireOrgAccess` + `getActiveOrganizationInviteLink`), même convention
 * que `PendingInvitationsTab`.
 */
export async function InviteLinkTab({
  orgSlug,
  activeLink,
}: {
  orgSlug: string;
  activeLink: OrganizationInviteLinkRow | null;
}) {
  if (!activeLink) {
    return <InviteLinkEmptyState orgSlug={orgSlug} />;
  }

  const locale = await getLocale();
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <InviteLinkCard
      orgSlug={orgSlug}
      link={{
        id: activeLink.id,
        url: `${getAppUrl()}/join/${activeLink.token}`,
        acceptanceMode: activeLink.acceptanceMode,
        usesCount: activeLink.usesCount,
        maxUses: activeLink.maxUses,
        expiresAtLabel: activeLink.expiresAt
          ? dateFormatter.format(activeLink.expiresAt)
          : null,
      }}
    />
  );
}
