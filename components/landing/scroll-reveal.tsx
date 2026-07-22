"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Fait apparaître son contenu en douceur au premier passage dans le
 * viewport (landing publique) — un seul type d'animation, réutilisé partout,
 * volontairement sobre. `IntersectionObserver` natif (pas de dépendance),
 * observé une seule fois (`unobserve` dès le premier passage) pour ne jamais
 * rejouer l'animation en re-scrollant. `motion-safe:` respecte
 * `prefers-reduced-motion` sans configuration supplémentaire.
 */
export function ScrollReveal({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.unobserve(node);
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out",
        visible ? "opacity-100 translate-y-0" : "motion-safe:opacity-0 motion-safe:translate-y-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
