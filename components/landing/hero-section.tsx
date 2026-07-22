import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { DashboardMockup } from "./dashboard-mockup";

/**
 * Au-dessus de la ligne de flottaison — pas de `ScrollReveal` ici : le hero
 * est déjà visible au chargement, une révélation différée nuirait au
 * ressenti de rapidité (et au LCP) plutôt que d'y aider.
 */
export async function HeroSection() {
  const t = await getTranslations("landing.hero");

  return (
    <section className="mx-auto max-w-6xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16 sm:pb-24 lg:px-8">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <h1 className="text-3xl leading-tight font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("subtitle")}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="w-full sm:w-auto" render={<Link href="/register" />}>
              {t("ctaPrimary")}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto"
              render={<Link href="#solution" />}
            >
              {t("ctaSecondary")}
            </Button>
          </div>
        </div>

        <DashboardMockup />
      </div>
    </section>
  );
}
