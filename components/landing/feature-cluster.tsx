import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FeatureAccordion } from "./feature-accordion";
import type { Cluster } from "./landing-content";
import { ScrollReveal } from "./scroll-reveal";

/**
 * Une grappe de fonctionnalités (Membres, Cotisations…) : ancre de la barre
 * de navigation (`id`), titre, puis ses sous-fonctionnalités en accordéon
 * (visuel à gauche, liste à droite sur desktop).
 * `scroll-mt-28` : header (56 px) + barre d'ancres (~50 px), pour que le
 * titre ne passe pas dessous au défilement.
 */
export async function FeatureCluster({
  cluster,
  shaded = false,
}: {
  cluster: Cluster;
  /** Fond légèrement teinté, pour alterner avec la grappe voisine. */
  shaded?: boolean;
}) {
  const t = await getTranslations(`landing.clusters.${cluster.id}`);

  const features = cluster.features.map((feature) => ({
    key: feature.key,
    title: t(`features.${feature.key}.title`),
    description: t(`features.${feature.key}.description`),
    image: { ...feature.image, alt: t(`features.${feature.key}.alt`) },
    bubble: { ...feature.bubble, text: t(`features.${feature.key}.bubble`) },
  }));

  return (
    <section
      id={cluster.id}
      aria-labelledby={`${cluster.id}-title`}
      className={cn("scroll-mt-28", shaded && "bg-muted/40")}
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-3 text-center">
          <h2
            id={`${cluster.id}-title`}
            className="text-2xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl"
          >
            {t("title")}
          </h2>
          {cluster.badge ? <Badge>{t("badge")}</Badge> : null}
        </div>

        <ScrollReveal className="mt-12 sm:mt-16">
          <FeatureAccordion id={cluster.id} features={features} />
        </ScrollReveal>
      </div>
    </section>
  );
}
