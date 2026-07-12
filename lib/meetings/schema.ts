import { z } from "zod";

import { isValidDatetimeLocal } from "./date";
import { MEETING_STATUSES, MEETING_TYPES } from "./constants";

/**
 * Messages d'erreur de validation, injectés depuis l'appelant (même patron
 * que `lib/members/schema.ts`, `lib/cotisations/schema.ts`).
 */
export interface MeetingFormMessages {
  titleMin: string;
  scheduledAtInvalid: string;
  durationPositive: string;
  videoLinkInvalid: string;
}

/**
 * Schéma de création/édition d'une réunion, partagé client/serveur
 * (schema-design §6.1, session 6A). `scheduledAt` n'est validé ici que dans
 * son format brut (`datetime-local`) — la conversion en `Date` UTC de
 * stockage se fait dans l'action, via `parseDatetimeLocalAsUtc`.
 */
export function buildMeetingSchema(m: MeetingFormMessages) {
  const emptyToUndef = (v: unknown) =>
    typeof v === "string" && v.trim() === "" ? undefined : v;

  return z.object({
    title: z.string().trim().min(2, m.titleMin),

    type: z.enum(MEETING_TYPES),

    description: z.preprocess(
      emptyToUndef,
      z.string().trim().max(2000).optional(),
    ),

    scheduledAt: z.string().refine(isValidDatetimeLocal, m.scheduledAtInvalid),

    durationMinutes: z.preprocess(
      emptyToUndef,
      z.coerce.number().int().positive(m.durationPositive).optional(),
    ),

    location: z.preprocess(
      emptyToUndef,
      z.string().trim().max(200).optional(),
    ),

    videoLink: z.preprocess(
      emptyToUndef,
      z.url(m.videoLinkInvalid).optional(),
    ),

    status: z.enum(MEETING_STATUSES),
  });
}

// Codes bruts pour la validation serveur (garde-fou). Les messages lisibles
// sont rendus côté client via next-intl.
const RAW_MESSAGES: MeetingFormMessages = {
  titleMin: "titleMin",
  scheduledAtInvalid: "scheduledAtInvalid",
  durationPositive: "durationPositive",
  videoLinkInvalid: "videoLinkInvalid",
};

export const meetingServerSchema = buildMeetingSchema(RAW_MESSAGES);

export type MeetingFormValues = z.output<typeof meetingServerSchema>;
