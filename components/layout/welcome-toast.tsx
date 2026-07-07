"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { toast } from "@/components/ui/toaster";

/**
 * Toast de bienvenue après `?welcome=true` (rejoindre une organisation via
 * une invitation, volet 2 de la 4B). Déclenché une seule fois au montage,
 * puis retire le paramètre de l'URL pour ne pas re-déclencher au refresh.
 */
export function WelcomeToast() {
  const t = useTranslations("invitations.accept");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("welcome") !== "true") return;

    toast.success(t("welcomeToast"));

    const params = new URLSearchParams(searchParams.toString());
    params.delete("welcome");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
    // Volontairement vide : ne doit se déclencher qu'au montage, pas à
    // chaque changement de `searchParams`/`router` (référence instable).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
