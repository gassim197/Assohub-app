"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CloudOff, WifiOff } from "lucide-react";

import { classifyThrownError } from "@/lib/errors/request-error";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Contenu commun des error boundaries (`app/error.tsx`,
 * `app/(dashboard)/[orgSlug]/error.tsx`) : réseau coupé ou service
 * indisponible, jamais de détail technique (en production, Next ne transmet
 * qu'un message générique et un `digest` pour les erreurs serveur).
 *
 * « Réessayer » appelle `retry` — `unstable_retry()` de Next, qui re-demande
 * le segment au serveur puis le ré-affiche. `reset()` ne ferait que
 * ré-afficher sans re-demander les données (doc Next de cette version,
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md) :
 * après une coupure réseau ou une panne de base, l'erreur reviendrait.
 */
export function RouteError({
  error,
  retry,
  showHomeLink = false,
  className,
}: {
  error: Error & { digest?: string };
  retry: () => void;
  showHomeLink?: boolean;
  className?: string;
}) {
  const t = useTranslations("common");
  const kind = classifyThrownError(error);
  const Icon = kind === "network" ? WifiOff : CloudOff;

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      role="alert"
      className={cn("flex flex-col items-center justify-center gap-4 px-4 py-16 text-center", className)}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-6" />
      </div>
      <div className="max-w-md space-y-1">
        <h1 className="text-lg font-semibold text-foreground">
          {t(kind === "network" ? "errorPage.networkTitle" : "errorPage.serverTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t(`errors.${kind}`)}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={() => retry()}>{t("errorPage.retry")}</Button>
        {showHomeLink ? (
          <Button variant="outline" render={<Link href="/" />}>
            {t("errorPage.home")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
