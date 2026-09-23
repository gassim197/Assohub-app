import { Screenshot, ScreenshotFrame } from "./screenshot-frame";

const HERO_POSTER = "/landing/dashboard.png";

/**
 * Emplacement prévu de la vidéo du hero : `public/landing/hero.mp4` (non
 * livrée pour l'instant). Une fois le fichier en place, remplacer `null` par
 * "/landing/hero.mp4" suffit : la capture du tableau de bord sert alors de
 * poster.
 */
const HERO_VIDEO_SRC: string | null = null;

/** Le visuel est plafonné à `max-w-5xl` (1024 px). */
const HERO_SIZES = "(min-width: 1088px) 1024px, 95vw";

/**
 * Visuel du hero : la capture du tableau de bord aujourd'hui, une vidéo
 * muette en boucle (même cadre, même format 16:10) demain.
 */
export function HeroMedia({
  alt,
  videoSrc = HERO_VIDEO_SRC,
}: {
  alt: string;
  videoSrc?: string | null;
}) {
  if (videoSrc) {
    return (
      <ScreenshotFrame>
        <video
          src={videoSrc}
          poster={HERO_POSTER}
          aria-label={alt}
          className="aspect-[16/10] h-auto w-full"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
      </ScreenshotFrame>
    );
  }

  return (
    <Screenshot
      src={HERO_POSTER}
      alt={alt}
      width={2880}
      height={1800}
      sizes={HERO_SIZES}
      preload
    />
  );
}
