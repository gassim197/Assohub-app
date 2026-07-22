import { Check, CheckCircle2, X, XCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Card, CardContent } from "@/components/ui/card";
import { ScrollReveal } from "./scroll-reveal";

const ITEM_KEYS = ["item1", "item2", "item3", "item4", "item5", "item6"] as const;

/**
 * Pont émotionnel entre le Problème et la Solution — deux colonnes
 * contrastées (terne/gris à gauche, emerald lumineux à droite). Empilées par
 * défaut (mobile d'abord), côte à côte à partir de `lg`.
 */
export async function BeforeAfterSection() {
  const t = await getTranslations("landing.beforeAfter");

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <ScrollReveal>
        <h2 className="max-w-2xl text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {t("title")}
        </h2>
      </ScrollReveal>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <ScrollReveal>
          <Card className="h-full bg-muted/50">
            <CardContent className="p-6 sm:p-8">
              <div className="mb-5 flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-full bg-foreground/10 text-muted-foreground">
                  <XCircle className="size-5" />
                </div>
                <h3 className="font-heading text-base font-semibold text-muted-foreground">
                  {t("without.label")}
                </h3>
              </div>
              <ul className="space-y-3">
                {ITEM_KEYS.map((key) => (
                  <li key={key} className="flex items-start gap-2.5 text-sm">
                    <X className="mt-0.5 size-4 shrink-0 text-muted-foreground/70" />
                    <span className="text-muted-foreground">
                      {t(`without.${key}`)}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </ScrollReveal>

        <ScrollReveal className="delay-150">
          <Card className="h-full bg-brand-subtle">
            <CardContent className="p-6 sm:p-8">
              <div className="mb-5 flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <CheckCircle2 className="size-5" />
                </div>
                <h3 className="font-heading text-base font-semibold text-foreground">
                  {t("with.label")}
                </h3>
              </div>
              <ul className="space-y-3">
                {ITEM_KEYS.map((key) => (
                  <li key={key} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span className="text-foreground">{t(`with.${key}`)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </ScrollReveal>
      </div>
    </section>
  );
}
