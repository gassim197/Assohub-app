"use client";

import { useTranslations } from "next-intl";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { SidebarContent } from "@/components/layout/sidebar";

/**
 * Sidebar mobile (< 768px, session 8C) — même contenu que la sidebar
 * desktop (`SidebarContent`, switcher d'organisations et menu utilisateur
 * compris), affiché en overlay via `Sheet` plutôt qu'en fixe. Se ferme au
 * tap sur l'overlay (comportement natif de `Sheet`) ou sur un lien de
 * navigation (`onNavigate`). Pas de bouton de fermeture additionnel
 * (`showClose={false}`) : le X par défaut est stylé pour un fond clair, pas
 * cohérent avec le navy de la sidebar.
 */
export function MobileSidebar({
  open,
  onOpenChange,
  ...contentProps
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
} & Omit<React.ComponentProps<typeof SidebarContent>, "onNavigate">) {
  const t = useTranslations("dashboard");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        showClose={false}
        className="w-72 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
      >
        <SheetTitle className="sr-only">{t("mobileMenuTitle")}</SheetTitle>
        <SidebarContent {...contentProps} onNavigate={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}
