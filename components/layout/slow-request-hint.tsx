"use client";

import { useTranslations } from "next-intl";

import { useSlowRequestHint } from "@/lib/errors/use-slow-request-hint";
import { cn } from "@/lib/utils";

/**
 * « La connexion est lente, merci de patienter… » sous le bouton d'envoi
 * d'un formulaire, affiché seulement si la requête dure plus de 4 s.
 * `aria-live` : annoncé aux lecteurs d'écran quand il apparaît.
 */
export function SlowRequestHint({ pending, className }: { pending: boolean; className?: string }) {
  const t = useTranslations("common");
  const slow = useSlowRequestHint(pending);

  return (
    <p aria-live="polite" className={cn("text-xs text-muted-foreground", !slow && "sr-only", className)}>
      {slow ? t("slowConnection") : null}
    </p>
  );
}
