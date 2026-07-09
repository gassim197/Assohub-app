import { z } from "zod";

import { todayISO } from "./period";
import {
  MAX_PAYMENT_AMOUNT_GNF,
  MIN_PAYMENT_AMOUNT_GNF,
  PAYMENT_METHODS,
  requiresPaymentReference,
} from "./payment-constants";

/**
 * Messages d'erreur de validation, injectés depuis l'appelant (même patron que
 * `lib/members/schema.ts` et `lib/cotisations/schema.ts`).
 */
export interface PaymentFormMessages {
  amountInteger: string;
  amountMin: string;
  amountMax: string;
  referenceRequired: string;
  dateInvalid: string;
  dateNotFuture: string;
  noteMax: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Schéma de création/édition d'un paiement, partagé client/serveur
 * (schema-design §5.3, session 5B §2).
 *
 * `amount` est saisi en unités GNF (comme `defaultAmount` sur les types de
 * cotisation) ; la conversion en centimes se fait à l'écriture (l'action).
 * `maxAmountGnf` permet à l'appelant (la modal) de resserrer le plafond au
 * montant restant dû pour un retour immédiat — le serveur reste la seule
 * source de vérité pour le refus « dépasse le montant dû » (contextuel à la
 * cotisation, non exprimable dans un schéma statique).
 */
export function buildPaymentSchema(
  m: PaymentFormMessages,
  options?: { maxAmountGnf?: number },
) {
  const emptyToUndef = (v: unknown) =>
    typeof v === "string" && v.trim() === "" ? undefined : v;
  const maxAmountGnf = options?.maxAmountGnf ?? MAX_PAYMENT_AMOUNT_GNF;

  return z
    .object({
      amount: z.coerce
        .number()
        .int(m.amountInteger)
        .min(MIN_PAYMENT_AMOUNT_GNF, m.amountMin)
        .max(maxAmountGnf, m.amountMax),

      paymentMethod: z.enum(PAYMENT_METHODS),

      paymentReference: z.preprocess(
        emptyToUndef,
        z.string().trim().max(200).optional(),
      ),

      paidAt: z
        .string()
        .regex(DATE_RE, m.dateInvalid)
        .refine((v) => v <= todayISO(), m.dateNotFuture),

      note: z.preprocess(
        emptyToUndef,
        z.string().trim().max(500, m.noteMax).optional(),
      ),
    })
    .superRefine((val, ctx) => {
      // schema-design §5.4 : référence obligatoire pour les 5 méthodes mobile money.
      if (requiresPaymentReference(val.paymentMethod) && !val.paymentReference) {
        ctx.addIssue({
          code: "custom",
          message: m.referenceRequired,
          path: ["paymentReference"],
        });
      }
    });
}

// Codes bruts pour la validation serveur (garde-fou). Les messages lisibles
// sont rendus côté client via next-intl.
const RAW_MESSAGES: PaymentFormMessages = {
  amountInteger: "amountInteger",
  amountMin: "amountMin",
  amountMax: "amountMax",
  referenceRequired: "referenceRequired",
  dateInvalid: "dateInvalid",
  dateNotFuture: "dateNotFuture",
  noteMax: "noteMax",
};

export const paymentServerSchema = buildPaymentSchema(RAW_MESSAGES);

export type PaymentFormValues = z.output<typeof paymentServerSchema>;
