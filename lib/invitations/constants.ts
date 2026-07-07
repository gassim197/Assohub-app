import { MEMBER_ROLES, type MemberRole } from "@/lib/members/constants";

// Durée de validité par défaut d'une invitation nominative (schema-design §4.4).
export const INVITATION_EXPIRY_DAYS = 30;

// `pending_invitations.intended_role` n'a pas de colonne `custom_role` associée
// (contrairement à `association_members`) : le rôle "autre" n'est donc pas
// proposable à l'invitation, faute de pouvoir stocker son libellé personnalisé.
export const INVITATION_ROLES = MEMBER_ROLES.filter(
  (role) => role !== "autre",
) as readonly Exclude<MemberRole, "autre">[];

export type InvitationRole = (typeof INVITATION_ROLES)[number];

export type PendingInvitationStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "expired";

/**
 * Dérive le statut d'affichage d'une invitation à partir de ses timestamps.
 * `pending_invitations` ne stocke pas de colonne `status` : le statut se
 * calcule depuis `accepted_at` / `declined_at` / `expires_at` (schema-design §4.4).
 */
export function invitationStatus(row: {
  acceptedAt: Date | null;
  declinedAt: Date | null;
  expiresAt: Date;
}): PendingInvitationStatus {
  if (row.acceptedAt) return "accepted";
  if (row.declinedAt) return "declined";
  if (row.expiresAt.getTime() < Date.now()) return "expired";
  return "pending";
}

/**
 * États affichables sur la page publique `/invitations/accept/[token]`
 * (volet 2 de la 4B) : sur-ensemble de `PendingInvitationStatus` avec les cas
 * "token inconnu" et "organisation introuvable" propres à cette route.
 */
export type AcceptPageState = "notFound" | "orgDeleted" | PendingInvitationStatus;

export function resolveAcceptPageState(
  data: {
    invitation: { acceptedAt: Date | null; declinedAt: Date | null; expiresAt: Date };
    organization: unknown;
  } | null,
): AcceptPageState {
  if (!data) return "notFound";
  if (!data.organization) return "orgDeleted";
  return invitationStatus(data.invitation);
}
