import { z } from "zod";

import { MINUTES_STATUSES } from "./minutes-constants";

/**
 * Messages d'erreur de validation, injectés depuis l'appelant (même patron
 * que `lib/meetings/schema.ts`).
 */
export interface MinutesFormMessages {
  bodyMarkdownMin: string;
}

/**
 * Schéma de création/édition d'un PV, partagé client/serveur (schema-design
 * §6.5). Seul `body_markdown` est requis — `agenda`, `decisions_summary` et
 * `actions_to_follow` sont des sections optionnelles.
 */
export function buildMinutesSchema(m: MinutesFormMessages) {
  const emptyToUndef = (v: unknown) =>
    typeof v === "string" && v.trim() === "" ? undefined : v;

  return z.object({
    agenda: z.preprocess(emptyToUndef, z.string().trim().max(5000).optional()),
    decisionsSummary: z.preprocess(
      emptyToUndef,
      z.string().trim().max(5000).optional(),
    ),
    actionsToFollow: z.preprocess(
      emptyToUndef,
      z.string().trim().max(5000).optional(),
    ),
    bodyMarkdown: z.string().trim().min(1, m.bodyMarkdownMin).max(50000),
  });
}

const RAW_MESSAGES: MinutesFormMessages = {
  bodyMarkdownMin: "bodyMarkdownMin",
};

export const minutesServerSchema = buildMinutesSchema(RAW_MESSAGES);

export type MinutesFormValues = z.output<typeof minutesServerSchema>;

/**
 * Schéma de changement de statut (checkpoint 2, sélecteur libre — même
 * patron que `changeMeetingStatusServerSchema`).
 */
export const changeMinutesStatusServerSchema = z.object({
  status: z.enum(MINUTES_STATUSES),
});
