import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";

/**
 * Header de la landing publique — pas de menu de navigation (les études de
 * conversion montrent qu'un menu distrait de l'objectif) : logo + un lien +
 * un CTA, rien d'autre.
 */
export async function LandingHeader() {
  const t = await getTranslations("landing.header");

  return (
    <header className="sticky top-0 z-40 border-b border-foreground/10 bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
          <Logo variant="full" />
        </Link>
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {t("login")}
          </Link>
          <Button size="sm" render={<Link href="/register" />}>
            {t("register")}
          </Button>
        </div>
      </div>
    </header>
  );
}
