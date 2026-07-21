"use client";

import { useTranslations } from "next-intl";

import { Separator } from "@/components/ui/separator";

export function AuthDivider() {
  const t = useTranslations("auth");

  return (
    <div className="flex items-center gap-3">
      <Separator className="flex-1" />
      <span className="text-xs text-muted-foreground">{t("orDivider")}</span>
      <Separator className="flex-1" />
    </div>
  );
}
