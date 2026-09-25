"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { FeatureBubble } from "./feature-bubble";
import type { BubbleIcon, BubblePosition } from "./landing-content";
import { ScreenshotFrame } from "./screenshot-frame";

export interface AccordionFeature {
  key: string;
  title: string;
  description: string;
  image: { src: string; width: number; height: number; alt: string };
  bubble: { text: string; icon: BubbleIcon; position: BubblePosition };
}

/**
 * Même `sizes` pour le visuel desktop et celui des panneaux mobiles : le
 * navigateur choisit la même variante et ne la télécharge qu'une fois.
 * 7/12 de la colonne `max-w-6xl` à partir de `lg` (≈ 640 px).
 */
const VISUAL_SIZES = "(min-width: 1024px) 640px, 100vw";

/**
 * Visuel 4:3 d'une grappe : toutes les images empilées, seule celle de
 * l'élément ouvert est visible (fondu enchaîné court, supprimé par
 * `prefers-reduced-motion` via `motion-safe:`). Le ratio fixe évite tout
 * saut de mise en page au changement d'élément.
 */
function FeatureVisual({
  features,
  activeIndex,
  eager,
}: {
  features: AccordionFeature[];
  activeIndex: number;
  eager: boolean;
}) {
  return (
    <div className="relative">
      <ScreenshotFrame>
        <div className="relative aspect-[4/3] bg-background">
          {features.map((feature, index) => (
            <Image
              key={feature.key}
              src={feature.image.src}
              alt={index === activeIndex ? feature.image.alt : ""}
              aria-hidden={index === activeIndex ? undefined : true}
              fill
              sizes={VISUAL_SIZES}
              loading={eager ? "eager" : "lazy"}
              className={cn(
                "object-cover object-top motion-safe:transition-opacity motion-safe:duration-200",
                index === activeIndex ? "opacity-100" : "opacity-0",
              )}
            />
          ))}
        </div>
      </ScreenshotFrame>
      {features.map((feature, index) => (
        <FeatureBubble
          key={feature.key}
          text={feature.bubble.text}
          icon={feature.bubble.icon}
          position={feature.bubble.position}
          className={cn(
            "motion-safe:transition-opacity motion-safe:duration-200",
            index === activeIndex ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        />
      ))}
    </div>
  );
}

/**
 * Grappe en accordéon (landing) : une seule sous-fonctionnalité ouverte à la
 * fois, la première par défaut, jamais de défilement automatique.
 *
 * - desktop (`lg`) : visuel à gauche (7/12 ≈ 58 %), liste à droite ;
 * - mobile : accordéon vertical, visuel sous le texte de l'élément ouvert.
 *
 * Accessibilité (motif « Accordion » WAI-ARIA) : chaque titre est un bouton
 * dans un `<h3>` avec `aria-expanded`/`aria-controls`, chaque panneau une
 * `region` ; ↑/↓/Début/Fin déplacent le focus entre les titres, Entrée et
 * Espace ouvrent. Le titre ouvert est `aria-disabled` : un panneau ne se
 * referme pas sans qu'un autre s'ouvre.
 *
 * Préchargement : dès que la grappe approche du viewport, toutes ses images
 * passent en chargement immédiat (y compris celles des panneaux mobiles
 * fermés), pour qu'un changement d'élément soit instantané — sans charger
 * au démarrage les images de toute la page.
 */
export function FeatureAccordion({ id, features }: { id: string; features: AccordionFeature[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [eager, setEager] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setEager(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  function onTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = features.length - 1;
    const target =
      event.key === "ArrowDown"
        ? index === last ? 0 : index + 1
        : event.key === "ArrowUp"
          ? index === 0 ? last : index - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (target === null) return;
    event.preventDefault();
    triggerRefs.current[target]?.focus();
  }

  return (
    <div ref={rootRef} className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
      <div className="hidden lg:col-span-7 lg:block">
        <FeatureVisual features={features} activeIndex={activeIndex} eager={eager} />
      </div>

      <div className="lg:col-span-5">
        {features.map((feature, index) => {
          const open = index === activeIndex;
          const triggerId = `${id}-${feature.key}-trigger`;
          const panelId = `${id}-${feature.key}-panel`;
          return (
            <div
              key={feature.key}
              className={cn(
                "border-l-2 py-4 pl-5 motion-safe:transition-colors motion-safe:duration-200",
                open ? "border-primary" : "border-border",
              )}
            >
              <h3>
                <button
                  ref={(node) => {
                    triggerRefs.current[index] = node;
                  }}
                  id={triggerId}
                  type="button"
                  aria-expanded={open}
                  aria-controls={panelId}
                  aria-disabled={open || undefined}
                  onClick={() => setActiveIndex(index)}
                  onKeyDown={(event) => onTriggerKeyDown(event, index)}
                  className={cn(
                    "w-full rounded-sm text-left text-lg font-semibold tracking-tight text-balance outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background sm:text-xl",
                    open ? "cursor-default text-foreground" : "cursor-pointer text-muted-foreground hover:text-foreground",
                  )}
                >
                  {feature.title}
                </button>
              </h3>
              <div id={panelId} role="region" aria-labelledby={triggerId} hidden={!open}>
                <p className="mt-2 text-base leading-relaxed text-pretty text-muted-foreground">
                  {feature.description}
                </p>
                <div className="mt-6 mb-2 lg:hidden">
                  <FeatureVisual features={[feature]} activeIndex={0} eager={eager} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
