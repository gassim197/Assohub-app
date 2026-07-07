import { randomBytes } from "crypto";

/**
 * Génère un token cryptographique imprévisible pour les invitations
 * (nominatives et liens partageables). 32 octets aléatoires encodés en
 * base64url ≈ 43 caractères — largement au-dessus du minimum de 32 caractères
 * exigé par la session 4B.
 */
export function generateInvitationToken(): string {
  return randomBytes(32).toString("base64url");
}
