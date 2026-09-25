import { getTranslations } from "next-intl/server";
import { Check, FileText, Lock, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import { ScrollReveal } from "./scroll-reveal";

/**
 * Section « confiance » (entre la grappe Pilotage et la FAQ). Trois
 * affirmations, chacune vérifiée dans le code avant d'être écrite — n'en
 * ajouter aucune autre (chiffrement, conformité, sauvegardes…) sans la même
 * vérification :
 *
 * 1. Cloisonnement : `requireOrgAccess` (lib/auth/org.ts) exige une session et
 *    l'appartenance à l'organisation (table `member`) sur chaque page et
 *    action métier, et toutes les requêtes filtrent sur `organizationId`.
 * 2. Documents privés : blobs en `access: "private"` (lib/documents/blob.ts),
 *    lus uniquement par la route authentifiée
 *    app/(dashboard)/[orgSlug]/documents/[documentId]/download ; l'URL Blob
 *    n'est jamais envoyée au navigateur.
 * 3. Aucun encaissement : aucun prestataire de paiement dans les
 *    dépendances ; lib/cotisations/payment-actions.ts ne fait qu'enregistrer
 *    des paiements réalisés hors de l'application.
 *
 * Les illustrations sont des interfaces stylisées (formes simples, barres
 * grises en guise de texte, accents emerald), purement décoratives.
 */

/** Barre grise tenant lieu de ligne de texte dans les illustrations. */
function Bar({ className }: { className: string }) {
  return <span className={cn("block h-1.5 rounded-full bg-foreground/10", className)} />;
}

/** Deux espaces d'association séparés, un cadenas emerald entre eux. */
function SeparateSpacesIllustration() {
  const space = (
    <div className="flex-1 space-y-2 rounded-lg border border-foreground/10 bg-card p-3 shadow-sm">
      <div className="flex items-center gap-1.5">
        <span className="size-3 rounded-full bg-primary/25" />
        <Bar className="w-10" />
      </div>
      <Bar className="w-full" />
      <Bar className="w-4/5" />
      <Bar className="w-3/5" />
    </div>
  );
  return (
    <div className="relative flex items-center gap-6">
      {space}
      <span className="absolute top-1/2 left-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-dropdown ring-4 ring-muted">
        <Lock className="size-4" strokeWidth={2.25} />
      </span>
      {space}
    </div>
  );
}

/** Liste de fichiers protégée par un bouclier. */
function PrivateFilesIllustration() {
  return (
    <div className="relative rounded-lg border border-foreground/10 bg-card p-3 shadow-sm">
      {["w-4/5", "w-3/5", "w-2/3"].map((width) => (
        <div key={width} className="flex items-center gap-2 border-b border-foreground/5 py-1.5 last:border-0">
          <FileText className="size-3.5 shrink-0 text-foreground/25" />
          <Bar className={width} />
        </div>
      ))}
      <span className="absolute -right-2.5 -bottom-2.5 flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-dropdown ring-4 ring-muted">
        <ShieldCheck className="size-4" strokeWidth={2.25} />
      </span>
    </div>
  );
}

/** Une ligne de paiement enregistré, coche emerald. */
function RecordedPaymentIllustration() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 rounded-lg border border-foreground/10 bg-card p-3 shadow-sm">
        <span className="size-7 shrink-0 rounded-full bg-foreground/10" />
        <div className="flex-1 space-y-1.5">
          <Bar className="w-3/4" />
          <Bar className="w-1/2" />
        </div>
        <span className="h-2 w-10 rounded-full bg-primary/40" />
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-4" strokeWidth={2.5} />
        </span>
      </div>
      <div className="flex items-center gap-3 rounded-lg border border-dashed border-foreground/10 p-3 opacity-60">
        <span className="size-7 shrink-0 rounded-full bg-foreground/10" />
        <div className="flex-1 space-y-1.5">
          <Bar className="w-2/3" />
          <Bar className="w-2/5" />
        </div>
      </div>
    </div>
  );
}

const CARDS = [
  { key: "espaces", Illustration: SeparateSpacesIllustration },
  { key: "documents", Illustration: PrivateFilesIllustration },
  { key: "paiements", Illustration: RecordedPaymentIllustration },
] as const;

export async function TrustSection() {
  const t = await getTranslations("landing.trust");

  return (
    <section aria-labelledby="trust-title" className="bg-muted/40">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <ScrollReveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2
              id="trust-title"
              className="text-2xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl"
            >
              {t("title")}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-balance text-muted-foreground sm:text-lg">
              {t("subtitle")}
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:mt-16 md:grid-cols-3">
            {CARDS.map(({ key, Illustration }) => (
              <div key={key} className="flex flex-col rounded-xl bg-card p-6 ring-1 ring-foreground/10">
                <div aria-hidden="true" className="flex h-36 items-center rounded-lg bg-muted px-5">
                  <div className="w-full">
                    <Illustration />
                  </div>
                </div>
                <h3 className="mt-6 text-lg font-semibold tracking-tight text-balance text-foreground">
                  {t(`cards.${key}.title`)}
                </h3>
                <p className="mt-2 text-base leading-relaxed text-pretty text-muted-foreground">
                  {t(`cards.${key}.text`)}
                </p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
