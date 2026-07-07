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

/**
 * Messages du formulaire d'inscription d'un invité (volet 2, checkpoint 2).
 * Pas de champ `email` : il vient de l'invitation, jamais du client.
 */
export interface RegisterInviteeFormMessages {
  nameMin: string;
  phoneInvalid: string;
  passwordMin: string;
  passwordUppercase: string;
  passwordNumber: string;
}

/** Téléphone obligatoire ici (contrairement à l'invitation) : E.164 strict, saisi par l'invité lui-même. */
export function buildRegisterInviteeSchema(m: RegisterInviteeFormMessages) {
  return z.object({
    fullName: z.string().trim().min(2, m.nameMin),
    phoneNumber: z.string().trim().refine(isValidPhone, m.phoneInvalid),
    password: z
      .string()
      .min(8, m.passwordMin)
      .regex(/[A-Z]/, m.passwordUppercase)
      .regex(/[0-9]/, m.passwordNumber),
  });
}

const RAW_REGISTER_MESSAGES: RegisterInviteeFormMessages = {
  nameMin: "nameMin",
  phoneInvalid: "phoneInvalid",
  passwordMin: "passwordMin",
  passwordUppercase: "passwordUppercase",
  passwordNumber: "passwordNumber",
};

export const registerInviteeServerSchema = buildRegisterInviteeSchema(
  RAW_REGISTER_MESSAGES,
);

export type RegisterInviteeValues = z.output<typeof registerInviteeServerSchema>;
