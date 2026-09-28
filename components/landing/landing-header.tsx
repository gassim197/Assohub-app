import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";

/**
 * Header de la landing publique : logo, connexion et inscription.
 * Hauteur fixe (`h-14`) : la barre d'ancres de la
 * landing (`SectionNav`) se colle juste en dessous (`top-14`).
 */
export async function LandingHeader() {
  const t = await getTranslations("landing.header");

  return (
    <header className="sticky top-0 z-40 border-b border-foreground/10 bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
          <Logo variant="full" className="gap-1.5 sm:gap-2.5" />
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center rounded-sm text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {t("login")}
          </Link>
          <Button size="sm" className="min-h-11" render={<Link href="/register" />}>
            <span className="sm:hidden">{t("registerShort")}</span>
            <span className="hidden sm:inline">{t("register")}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
