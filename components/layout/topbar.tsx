"use client";

import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export function Topbar({ onOpenMobileNav }: { onOpenMobileNav?: () => void }) {
  const tDashboard = useTranslations("dashboard");

  return (
    <header className="flex h-14 items-center border-b bg-background px-4 md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label={tDashboard("openMobileMenu")}
        onClick={onOpenMobileNav}
      >
        <Menu className="size-4" />
      </Button>
    </header>
  );
}
