import { z } from "zod";

import { isValidPhone } from "@/lib/phone";
import { INVITATION_ROLES } from "./constants";

/**
 * Messages d'erreur de validation, injectés depuis l'appelant (client/serveur),
 * même convention que `lib/members/schema.ts`.
 */
export interface InviteMemberFormMessages {
  nameMin: string;
  emailInvalid: string;
  phoneInvalid: string;
  messageMax: string;
}

/**
 * Schéma d'invitation nominative, partagé client/serveur (schema-design §4.4).
 *
 * Téléphone optionnel à l'invitation (obligatoire seulement à l'acceptation,
 * saisi par l'invité lui-même) : validé uniquement s'il est renseigné.
 */
export function buildInviteMemberSchema(m: InviteMemberFormMessages) {
  const emptyToUndef = (v: unknown) =>
    typeof v === "string" && v.trim() === "" ? undefined : v;

  return z.object({
    email: z.email(m.emailInvalid),

    fullName: z.string().trim().min(2, m.nameMin),

    phoneNumber: z.preprocess(
      emptyToUndef,
      z.string().trim().refine(isValidPhone, m.phoneInvalid).optional(),
    ),

    intendedRole: z.enum(INVITATION_ROLES),

    personalMessage: z.preprocess(
      emptyToUndef,
      z.string().trim().max(1000, m.messageMax).optional(),
    ),
  });
}

const RAW_MESSAGES: InviteMemberFormMessages = {
  nameMin: "nameMin",
  emailInvalid: "emailInvalid",
  phoneInvalid: "phoneInvalid",
  messageMax: "messageMax",
};

export const inviteMemberServerSchema = buildInviteMemberSchema(RAW_MESSAGES);

export type InviteMemberValues = z.output<typeof inviteMemberServerSchema>;
