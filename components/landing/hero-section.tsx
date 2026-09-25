import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, CircleCheck, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { HeroVisual } from "./hero-media";

/**
 * Destination du bouton « Voir la démo ». Tant qu'elle n'est pas définie
 * (`null`), le bouton n'est pas affiché — la future page démo accueillera
 * probablement la vidéo (`HeroMedia`).
 */
const DEMO_HREF: string | null = null;

const ARGUMENT_KEYS = ["free", "noCard", "noInstall"] as const;

/**
 * Trait emerald (#10B981, `--primary`) légèrement courbé, façon coup de
 * pinceau, sous la seconde partie du titre. Tracé SVG vectoriel posé en fond
 * du texte avec `box-decoration-break: clone` : quand le titre passe sur
 * plusieurs lignes, chaque ligne reçoit son propre trait, à sa largeur — un
 * SVG positionné sous un bloc s'étirerait sur toute la colonne.
 * `preserveAspectRatio="none"` : le trait s'étire à la longueur de la ligne.
 */
const BRUSH_UNDERLINE_STYLE = {
  backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 16" preserveAspectRatio="none"><path d="M3 11.5C58 4.5 126 2.5 196 5.5c36 1.6 69 4.2 101 7" fill="none" stroke="#10B981" stroke-opacity="0.7" stroke-width="5" stroke-linecap="round"/></svg>',
  )}")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "0 100%",
  backgroundSize: "100% 0.2em",
  paddingBottom: "0.1em",
} as const;

/**
 * Au-dessus de la ligne de flottaison — pas de `ScrollReveal` ici : le hero
 * est déjà visible au chargement, une révélation différée nuirait au
 * ressenti de rapidité (et au LCP) plutôt que d'y aider.
 *
 * Desktop : texte à gauche (5/12), visuel à droite (7/12). Mobile : texte
 * puis visuel, bouton pleine largeur.
 */
export async function HeroSection() {
  const t = await getTranslations("landing.hero");

  return (
    <section className="overflow-x-clip">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-16 sm:px-6 sm:pt-16 lg:grid-cols-12 lg:gap-10 lg:px-8 lg:pt-20 lg:pb-24">
        <div className="lg:col-span-5">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-brand-subtle px-2.5 py-1 text-xs font-medium text-foreground sm:px-3 sm:text-sm">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
            {t("badge")}
          </p>

          <h1 className="mt-6 text-4xl leading-[1.18] font-bold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
            {t("titleLead")}{" "}
            {/*
              Partie emerald : toujours sur ses propres lignes (`block`), équilibrée
              pour elle-même (« sans cahier / ni tableur », jamais un mot isolé) ;
              le soulignement est porté par le texte en ligne, une fois par ligne.
            */}
            <span className="block text-balance text-primary">
              <span className="box-decoration-clone" style={BRUSH_UNDERLINE_STYLE}>
                {t("titleAccent")}
              </span>
            </span>
          </h1>

          <p className="mt-7 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
            {t("subtitle")}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="w-full sm:w-auto" render={<Link href="/register" />}>
              {t("ctaPrimary")}
              <ArrowRight aria-hidden="true" />
            </Button>
            {DEMO_HREF ? (
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto"
                render={<Link href={DEMO_HREF} />}
              >
                <Play aria-hidden="true" />
                {t("ctaDemo")}
              </Button>
            ) : null}
          </div>

          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {ARGUMENT_KEYS.map((key) => (
              <li key={key} className="flex items-center gap-1.5">
                <CircleCheck aria-hidden="true" className="size-4 shrink-0 text-primary" />
                {t(`args.${key}`)}
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-7">
          <HeroVisual
            alt={t("mediaAlt")}
            duesBubble={t("bubbles.dues")}
            remindersBubble={t("bubbles.reminders")}
          />
        </div>
      </div>
    </section>
  );
}
