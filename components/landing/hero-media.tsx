import { FeatureBubble } from "./feature-bubble";
import { Screenshot } from "./screenshot-frame";

const HERO_POSTER = "/landing/dashboard.png";

/**
 * Colonne visuel du hero : 7/12 de `max-w-6xl` (≈ 620 px) une fois la
 * largeur maximale atteinte, ~55 % de la largeur à partir de `lg`, pleine
 * largeur avant.
 */
const HERO_SIZES = "(min-width: 1152px) 620px, (min-width: 1024px) 55vw, 92vw";

/**
 * Visuel du hero : capture complète du tableau de bord (16:10) dans le cadre
 * fenêtre, posée sur un panneau vert légèrement décalé (sans rotation, pour
 * ne pas déformer la capture), avec deux bulles de bénéfice en débordement.
 * Chargée en priorité (`preload`) : c'est l'élément LCP de la page.
 */
export function HeroVisual({
  alt,
  duesBubble,
  remindersBubble,
}: {
  alt: string;
  duesBubble: string;
  remindersBubble: string;
}) {
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute -inset-10 -z-10 hidden rounded-full bg-brand/10 blur-3xl lg:block"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 translate-x-2 translate-y-2 rounded-xl bg-brand/15 ring-1 ring-brand/20 sm:translate-x-4 sm:translate-y-4"
      />
      <div className="relative">
        <Screenshot
          src={HERO_POSTER}
          alt={alt}
          width={2880}
          height={1800}
          sizes={HERO_SIZES}
          preload
        />
      </div>
      <FeatureBubble text={duesBubble} icon="wallet" position="top-right" />
      <FeatureBubble text={remindersBubble} icon="send" position="bottom-left" />
    </div>
  );
}
