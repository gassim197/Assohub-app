import { z } from "zod";

import { isValidPhone } from "@/lib/phone";
import {
  INVITATION_ROLES,
  INVITE_LINK_ACCEPTANCE_MODES,
  INVITE_LINK_EXPIRY_OPTIONS,
  INVITE_LINK_MAX_USES_OPTIONS,
} from "./constants";

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

/**
 * Messages du formulaire de génération de lien partageable (volet 3 de la 4B,
 * checkpoint 1).
 */
export interface GenerateInviteLinkFormMessages {
  customExpiresAtRequired: string;
  maxUsesValueRequired: string;
}

/**
 * `customExpiresAt`/`maxUsesValue` sont conditionnels à `expiryOption`/
 * `maxUsesOption` (radios) : validés via `superRefine` plutôt que des champs
 * toujours requis, pour ne pas bloquer les combinaisons "jamais"/"illimité".
 */
export function buildGenerateInviteLinkSchema(m: GenerateInviteLinkFormMessages) {
  return z
    .object({
      defaultRole: z.enum(INVITATION_ROLES),
      acceptanceMode: z.enum(INVITE_LINK_ACCEPTANCE_MODES),
      expiryOption: z.enum(INVITE_LINK_EXPIRY_OPTIONS),
      customExpiresAt: z.string().optional(),
      maxUsesOption: z.enum(INVITE_LINK_MAX_USES_OPTIONS),
      maxUsesValue: z.preprocess(
        (v) => (v === "" || v === undefined || v === null ? undefined : Number(v)),
        z.number().int().positive().optional(),
      ),
    })
    .superRefine((data, ctx) => {
      if (data.expiryOption === "custom") {
        const parsed = data.customExpiresAt ? new Date(data.customExpiresAt) : null;
        if (!parsed || Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
          ctx.addIssue({
            code: "custom",
            path: ["customExpiresAt"],
            message: m.customExpiresAtRequired,
          });
        }
      }

      if (data.maxUsesOption === "limited" && !data.maxUsesValue) {
        ctx.addIssue({
          code: "custom",
          path: ["maxUsesValue"],
          message: m.maxUsesValueRequired,
        });
      }
    });
}

const RAW_GENERATE_INVITE_LINK_MESSAGES: GenerateInviteLinkFormMessages = {
  customExpiresAtRequired: "customExpiresAtRequired",
  maxUsesValueRequired: "maxUsesValueRequired",
};

export const generateInviteLinkServerSchema = buildGenerateInviteLinkSchema(
  RAW_GENERATE_INVITE_LINK_MESSAGES,
);

export type GenerateInviteLinkValues = z.output<typeof generateInviteLinkServerSchema>;

/**
 * Messages du formulaire d'inscription via lien partageable (volet 4 de la
 * 4B, checkpoint 2). Contrairement à `RegisterInviteeFormMessages`, `email`
 * est un champ du formulaire : aucune invitation nommée n'en fixe la valeur
 * à l'avance.
 */
export interface RegisterViaLinkFormMessages {
  nameMin: string;
  emailInvalid: string;
  phoneInvalid: string;
  passwordMin: string;
  passwordUppercase: string;
  passwordNumber: string;
}

export function buildRegisterViaLinkSchema(m: RegisterViaLinkFormMessages) {
  return z.object({
    fullName: z.string().trim().min(2, m.nameMin),
    email: z.email(m.emailInvalid),
    phoneNumber: z.string().trim().refine(isValidPhone, m.phoneInvalid),
    password: z
      .string()
      .min(8, m.passwordMin)
      .regex(/[A-Z]/, m.passwordUppercase)
      .regex(/[0-9]/, m.passwordNumber),
  });
}

const RAW_REGISTER_VIA_LINK_MESSAGES: RegisterViaLinkFormMessages = {
  nameMin: "nameMin",
  emailInvalid: "emailInvalid",
  phoneInvalid: "phoneInvalid",
  passwordMin: "passwordMin",
  passwordUppercase: "passwordUppercase",
  passwordNumber: "passwordNumber",
};

export const registerViaLinkServerSchema = buildRegisterViaLinkSchema(
  RAW_REGISTER_VIA_LINK_MESSAGES,
);

export type RegisterViaLinkValues = z.output<typeof registerViaLinkServerSchema>;
