import { LandingHeader } from "./landing-header";
import { HeroSection } from "./hero-section";
import { ProblemSection } from "./problem-section";
import { SolutionSection } from "./solution-section";
import { WhyAssoHubSection } from "./why-assohub-section";
import { HowItWorksSection } from "./how-it-works-section";
import { FinalCtaSection } from "./final-cta-section";
import { LandingFooter } from "./landing-footer";

/**
 * Landing publique de assohub-gn.com — rendue à la racine `/` pour les
 * visiteurs sans session (`app/page.tsx`). Pure présentation, aucune
 * logique métier : chaque section est un Server Component statique.
 */
export function LandingPage() {
  return (
    <div className="flex min-h-full flex-col">
      <LandingHeader />
      <main className="flex-1">
        <HeroSection />
        <ProblemSection />
        <SolutionSection />
        <WhyAssoHubSection />
        <HowItWorksSection />
        <FinalCtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}
