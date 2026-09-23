import { LandingHeader } from "./landing-header";
import { HeroSection } from "./hero-section";
import { SectionNav } from "./section-nav";
import { FeatureCluster } from "./feature-cluster";
import { FinalCtaSection } from "./final-cta-section";
import { LandingFooter } from "./landing-footer";
import { CLUSTERS } from "./landing-content";

/**
 * Landing publique de assohub-gn.com — rendue à la racine `/` pour les
 * visiteurs sans session (`app/page.tsx`). Pure présentation, aucune
 * logique métier : hero, barre d'ancres collante, puis une grappe par
 * domaine fonctionnel (captures produit), et l'appel à l'action final.
 */
export function LandingPage() {
  return (
    <div className="flex min-h-full flex-col">
      <LandingHeader />
      <main className="flex-1">
        <HeroSection />
        <SectionNav />
        {CLUSTERS.map((cluster, index) => (
          <FeatureCluster key={cluster.id} cluster={cluster} shaded={index % 2 === 1} />
        ))}
        <FinalCtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}
