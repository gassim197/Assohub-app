"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { CLUSTER_IDS, type ClusterId } from "./landing-content";

/**
 * Barre d'ancres collante sous le hero (juste sous le header, `top-14`).
 * Met en évidence la grappe visible via `IntersectionObserver` : une
 * section est « active » quand elle traverse une bande située sous la
 * barre, dans le tiers haut de l'écran. Le défilement doux vient de
 * `scroll-smooth` sur `<html>`, le décalage de `scroll-mt-*` sur chaque
 * grappe. Sur mobile, défilement horizontal sans barre visible ; l'onglet
 * actif est ramené dans le champ.
 */
export function SectionNav() {
  const t = useTranslations("landing.nav");
  const [active, setActive] = useState<ClusterId | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const visible = new Set<ClusterId>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id as ClusterId;
          if (entry.isIntersecting) visible.add(id);
          else visible.delete(id);
        }
        setActive(CLUSTER_IDS.find((id) => visible.has(id)) ?? null);
      },
      // Bande de détection : de 120 px sous le haut (header + barre) à 60 % de la hauteur.
      { rootMargin: "-120px 0px -60% 0px" },
    );

    for (const id of CLUSTER_IDS) {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (!list || !active) return;
    const link = list.querySelector<HTMLAnchorElement>(`a[href="#${active}"]`);
    if (!link) return;
    // Défilement horizontal de la barre seulement (jamais de la page).
    const target = link.offsetLeft - (list.clientWidth - link.offsetWidth) / 2;
    list.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [active]);

  return (
    <nav
      aria-label={t("label")}
      className="sticky top-14 z-30 border-y border-foreground/10 bg-background/85 backdrop-blur-sm"
    >
      <ul
        ref={listRef}
        className="mx-auto flex max-w-6xl gap-1 overflow-x-auto overflow-y-hidden px-4 py-2 [scrollbar-width:none] sm:justify-center sm:px-6 lg:px-8 [&::-webkit-scrollbar]:hidden"
      >
        {CLUSTER_IDS.map((id) => {
          const isActive = active === id;
          return (
            <li key={id} className="shrink-0">
              <a
                href={`#${id}`}
                aria-current={isActive ? "location" : undefined}
                className={cn(
                  "block rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "bg-brand-subtle text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t(id)}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
