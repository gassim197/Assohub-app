import { z } from "zod";

import { COTISATION_FREQUENCIES } from "./constants";

/**
 * Messages d'erreur de validation, injectés depuis l'appelant (même patron que
 * `lib/members/schema.ts`) : traductions next-intl côté client, codes bruts
 * côté serveur (garde-fou, les messages lisibles ont déjà été rendus).
 */
export interface CotisationTypeFormMessages {
  nameMin: string;
  amountPositive: string;
}

/**
 * Schéma de création/édition d'un type de cotisation, partagé client/serveur
 * (schema-design §5.1). `defaultAmount` est saisi en unités GNF par
 * l'utilisateur ; la conversion en centimes se fait à l'écriture (actions),
 * pas dans le schéma, pour que le formulaire reste en unités lisibles.
 */
export function buildCotisationTypeSchema(m: CotisationTypeFormMessages) {
  const emptyToUndef = (v: unknown) =>
    typeof v === "string" && v.trim() === "" ? undefined : v;

  return z.object({
    name: z.string().trim().min(2, m.nameMin),

    description: z.preprocess(
      emptyToUndef,
      z.string().trim().max(500).optional(),
    ),

    defaultAmount: z.coerce.number().positive(m.amountPositive),

    frequency: z.enum(COTISATION_FREQUENCIES),

    autoGenerate: z.boolean(),

    isActive: z.boolean(),
  });
}

// Codes bruts pour la validation serveur (garde-fou).
const RAW_MESSAGES: CotisationTypeFormMessages = {
  nameMin: "nameMin",
  amountPositive: "amountPositive",
};

export const cotisationTypeServerSchema = buildCotisationTypeSchema(RAW_MESSAGES);

export type CotisationTypeFormValues = z.output<typeof cotisationTypeServerSchema>;
