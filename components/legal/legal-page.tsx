import { LandingHeader } from "@/components/landing/landing-header";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LegalBody } from "./legal-body";

export interface LegalSection {
  id: string;
  title: string;
  body: string;
}

interface LegalPageProps {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
  /** Sommaire cliquable — utile sur les pages longues (confidentialité, CGU), omis sur les courtes. */
  showToc?: boolean;
}

/**
 * Coquille partagée des 3 pages légales publiques (mentions légales,
 * confidentialité, CGU) — réutilise le header/footer de la landing pour que
 * ces pages semblent faire partie du même site, largeur de texte limitée
 * pour une lecture longue confortable.
 */
export function LegalPage({ title, lastUpdated, sections, showToc = false }: LegalPageProps) {
  return (
    <div className="flex min-h-full flex-col">
      <LandingHeader />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{lastUpdated}</p>

          {showToc ? (
            <nav
              aria-label="Sommaire"
              className="mt-8 rounded-lg border border-foreground/10 bg-muted/30 p-4 sm:p-5"
            >
              <ol className="space-y-1.5 text-sm">
                {sections.map((section, index) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="text-muted-foreground hover:text-primary hover:underline"
                    >
                      {index + 1}. {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}

          <div className="mt-10 space-y-10">
            {sections.map((section, index) => (
              <section key={section.id} id={section.id} className="scroll-mt-20">
                <h2 className="text-lg font-semibold text-foreground sm:text-xl">
                  {index + 1}. {section.title}
                </h2>
                <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  <LegalBody text={section.body} />
                </div>
              </section>
            ))}
          </div>
        </article>
      </main>
      <LandingFooter />
    </div>
  );
}
