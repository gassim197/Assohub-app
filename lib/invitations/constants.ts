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
