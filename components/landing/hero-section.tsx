import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { HeroMedia } from "./hero-media";

/**
 * Au-dessus de la ligne de flottaison — pas de `ScrollReveal` ici : le hero
 * est déjà visible au chargement, une révélation différée nuirait au
 * ressenti de rapidité (et au LCP) plutôt que d'y aider.
 */
export async function HeroSection() {
  const t = await getTranslations("landing.hero");

  return (
    <section className="mx-auto max-w-6xl px-4 pt-12 pb-12 sm:px-6 sm:pt-20 sm:pb-16 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-3xl leading-tight font-bold tracking-tight text-balance text-foreground sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-5 text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
          {t("subtitle")}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button size="lg" className="w-full sm:w-auto" render={<Link href="/register" />}>
            {t("ctaPrimary")}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full sm:w-auto"
            render={<Link href="/login" />}
          >
            {t("ctaSecondary")}
          </Button>
        </div>
      </div>

      <div className="mx-auto mt-12 max-w-5xl sm:mt-16">
        <HeroMedia alt={t("mediaAlt")} />
      </div>
    </section>
  );
}
