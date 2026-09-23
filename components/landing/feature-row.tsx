import { cn } from "@/lib/utils";
import { ScrollReveal } from "./scroll-reveal";

/**
 * Une sous-fonctionnalité : texte + visuel côte à côte à partir de `lg`
 * (texte à gauche, ou à droite si `reversed`), empilés texte puis visuel
 * en dessous.
 */
export function FeatureRow({
  title,
  description,
  media,
  reversed = false,
}: {
  title: string;
  description: string;
  media: React.ReactNode;
  reversed?: boolean;
}) {
  return (
    <ScrollReveal className="grid items-center gap-8 lg:grid-cols-5 lg:gap-16">
      <div className={cn("lg:col-span-2", reversed && "lg:order-2")}>
        <h3 className="text-xl font-semibold tracking-tight text-balance text-foreground sm:text-2xl">
          {title}
        </h3>
        <p className="mt-3 text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
          {description}
        </p>
      </div>
      <div className={cn("lg:col-span-3", reversed && "lg:order-1")}>{media}</div>
    </ScrollReveal>
  );
}
