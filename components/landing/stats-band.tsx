import { getTranslations } from "next-intl/server";

import { ScrollReveal } from "./scroll-reveal";

const STAT_KEYS = ["modules", "payments", "french", "free"] as const;

/**
 * Bande de chiffres factuels sur le produit (pas d'utilisateurs, pas de
 * témoignages) — volontairement discrète : pas de `Card`, juste un fond
 * légèrement distinct entre deux bordures, pour marquer une respiration dans
 * le rythme visuel entre "Pourquoi AssoHub" et "Comment ça marche".
 */
export async function StatsBand() {
  const t = await getTranslations("landing.stats");

  return (
    <section className="border-y border-foreground/10 bg-muted/30">
      <ScrollReveal className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 text-center sm:grid-cols-4">
          {STAT_KEYS.map((key) => {
            const label = t(`items.${key}.label`);
            return (
              <div key={key}>
                <p className="text-xl font-bold text-primary sm:text-2xl">
                  {t(`items.${key}.value`)}
                </p>
                {label ? (
                  <p className="mt-1 text-sm text-muted-foreground">{label}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </ScrollReveal>
    </section>
  );
}
