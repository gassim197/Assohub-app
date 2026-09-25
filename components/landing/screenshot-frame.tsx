import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * Cadre sobre façon fenêtre autour d'une capture produit : barre de titre
 * à trois pastilles, coins arrondis, bordure fine, ombre légère.
 */
export function ScreenshotFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-foreground/10 bg-card shadow-lg",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="flex h-6 items-center gap-1.5 border-b border-foreground/10 bg-muted px-3 sm:h-8"
      >
        <span className="size-2 rounded-full bg-foreground/15 sm:size-2.5" />
        <span className="size-2 rounded-full bg-foreground/15 sm:size-2.5" />
        <span className="size-2 rounded-full bg-foreground/15 sm:size-2.5" />
      </div>
      {children}
    </div>
  );
}

/** Capture produit encadrée. Chargement différé par défaut (`next/image`). */
export function Screenshot({
  src,
  alt,
  width,
  height,
  sizes,
  preload = false,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  sizes: string;
  preload?: boolean;
}) {
  return (
    <ScreenshotFrame>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        preload={preload}
        className="h-auto w-full"
      />
    </ScreenshotFrame>
  );
}
