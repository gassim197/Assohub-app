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

// ─── Lien d'invitation partageable (volet 3 de la 4B) ──────────────────────────
// `organization_invite_links.default_role` n'a pas non plus de colonne
// `custom_role` : mêmes rôles proposables que l'invitation nominative.

export const INVITE_LINK_ACCEPTANCE_MODES = ["auto", "manual"] as const;
export type InviteLinkAcceptanceMode = (typeof INVITE_LINK_ACCEPTANCE_MODES)[number];

export function isInviteLinkAcceptanceMode(
  value: string,
): value is InviteLinkAcceptanceMode {
  return (INVITE_LINK_ACCEPTANCE_MODES as readonly string[]).includes(value);
}

export const INVITE_LINK_EXPIRY_OPTIONS = ["never", "7d", "30d", "custom"] as const;
export type InviteLinkExpiryOption = (typeof INVITE_LINK_EXPIRY_OPTIONS)[number];

export const INVITE_LINK_MAX_USES_OPTIONS = ["unlimited", "limited"] as const;
export type InviteLinkMaxUsesOption = (typeof INVITE_LINK_MAX_USES_OPTIONS)[number];

/**
 * Résout `expires_at` à partir du choix du formulaire de génération. `custom`
 * exige une date déjà validée (future) par le schéma Zod — `customDate` n'est
 * lu que dans ce cas.
 */
export function resolveInviteLinkExpiresAt(
  option: InviteLinkExpiryOption,
  customDate: Date | null,
): Date | null {
  if (option === "never") return null;
  if (option === "custom") return customDate;

  const days = option === "7d" ? 7 : 30;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * États affichables sur la page publique `/join/[token]` (volet 4 de la 4B) —
 * pendant d'`AcceptPageState` pour le lien partageable. Pas d'équivalent
 * "accepted"/"declined" : un lien reste utilisable par plusieurs personnes
 * tant qu'il n'est pas révoqué/expiré/épuisé, contrairement à l'invitation
 * nominative à usage unique.
 */
export type InviteLinkPageState =
  | "notFound"
  | "orgDeleted"
  | "revoked"
  | "expired"
  | "exhausted"
  | "active";

export function resolveInviteLinkPageState(
  data: {
    link: {
      revokedAt: Date | null;
      expiresAt: Date | null;
      maxUses: number | null;
      usesCount: number;
    };
    organization: unknown;
  } | null,
): InviteLinkPageState {
  if (!data) return "notFound";
  if (!data.organization) return "orgDeleted";
  if (data.link.revokedAt) return "revoked";
  if (data.link.expiresAt && data.link.expiresAt.getTime() < Date.now()) {
    return "expired";
  }
  if (data.link.maxUses !== null && data.link.usesCount >= data.link.maxUses) {
    return "exhausted";
  }
  return "active";
}
