"use client";

import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function Topbar() {
  const t = useTranslations("common");

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-6">
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
