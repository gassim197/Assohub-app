"use client";

import { Bell, Menu } from "lucide-react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function Topbar({ onOpenMobileNav }: { onOpenMobileNav?: () => void }) {
  const t = useTranslations("common");
  const tDashboard = useTranslations("dashboard");

  return (
    <header className="flex h-14 items-center gap-2 border-b bg-background px-4 md:gap-4 md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label={tDashboard("openMobileMenu")}
        onClick={onOpenMobileNav}
      >
        <Menu className="size-4" />
      </Button>
      <div className="flex-1 max-w-sm">
        <Input
          placeholder={t("search")}
          disabled
          className="h-8 bg-muted/50"
        />
      </div>
      <Button variant="ghost" size="icon" disabled aria-label="Notifications">
        <Bell className="size-4" />
      </Button>
    </header>
  );
}
