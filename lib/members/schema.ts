import { z } from "zod";

import { isValidPhone } from "@/lib/phone";
import { MEMBER_ROLES, MEMBER_STATUSES } from "./constants";

/**
 * Schéma de changement de statut (action ciblée `changeMemberStatus`, BLOC 3).
 * Garde-fou serveur : on n'accepte qu'un statut métier connu.
 */
export const changeStatusServerSchema = z.object({
  status: z.enum(MEMBER_STATUSES),
});

/**
 * Messages d'erreur de validation, injectés depuis l'appelant.
 * - Côté client : traductions next-intl (affichées sous les champs).
 * - Côté serveur : codes bruts (la validation serveur est un garde-fou ;
 *   les messages lisibles ont déjà été rendus côté client).
 */
export interface MemberFormMessages {
  nameMin: string;
  phoneInvalid: string;
  emailInvalid: string;
  customRoleRequired: string;
  dateInvalid: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Schéma de création d'un membre, partagé client/serveur (schema-design §4).
 *
 * Téléphone : **strict** via `isValidPhone` (libphonenumber-js). Aucune
 * tolérance chaîne vide ici — la tolérance `''` est réservée au fondateur
 * auto-créé (cf. ADR-0002), qui passe par un chemin distinct.
 */
export function buildCreateMemberSchema(m: MemberFormMessages) {
  const emptyToUndef = (v: unknown) =>
    typeof v === "string" && v.trim() === "" ? undefined : v;

  return z
    .object({
      fullName: z.string().trim().min(2, m.nameMin),

      phoneNumber: z.string().trim().refine(isValidPhone, m.phoneInvalid),

      email: z.preprocess(
        emptyToUndef,
        z.email(m.emailInvalid).optional(),
      ),

      joinedAt: z.string().regex(DATE_RE, m.dateInvalid),

      dateOfBirth: z.preprocess(
        emptyToUndef,
        z.string().regex(DATE_RE, m.dateInvalid).optional(),
      ),

      profession: z.preprocess(
        emptyToUndef,
        z.string().trim().max(200).optional(),
      ),

      notes: z.preprocess(
        emptyToUndef,
        z.string().trim().max(2000).optional(),
      ),

      role: z.enum(MEMBER_ROLES),

      customRole: z.preprocess(
        emptyToUndef,
        z.string().trim().max(100).optional(),
      ),

      status: z.enum(MEMBER_STATUSES),
    })
    .superRefine((val, ctx) => {
      // schema-design §4.2 : `custom_role` obligatoire quand role = 'autre'.
      if (val.role === "autre" && !val.customRole) {
        ctx.addIssue({
          code: "custom",
          message: m.customRoleRequired,
          path: ["customRole"],
        });
      }
    });
}

// Codes bruts pour la validation serveur (garde-fou). Les messages lisibles
// sont rendus côté client via next-intl.
const RAW_MESSAGES: MemberFormMessages = {
  nameMin: "nameMin",
  phoneInvalid: "phoneInvalid",
  emailInvalid: "emailInvalid",
  customRoleRequired: "customRoleRequired",
  dateInvalid: "dateInvalid",
};

export const createMemberServerSchema = buildCreateMemberSchema(RAW_MESSAGES);

export type CreateMemberValues = z.output<typeof createMemberServerSchema>;
