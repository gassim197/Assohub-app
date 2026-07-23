import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Logo } from "@/components/ui/logo";

export async function LandingFooter() {
  const t = await getTranslations("landing.footer");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-foreground/10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-10 text-center sm:flex-row sm:justify-between sm:px-6 sm:text-left lg:px-8">
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <Logo variant="full" />
          <p className="max-w-xs text-sm text-muted-foreground">{t("tagline")}</p>
        </div>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/login" className="text-muted-foreground hover:text-foreground">
              {t("login")}
            </Link>
            <Link href="/register" className="text-muted-foreground hover:text-foreground">
              {t("register")}
            </Link>
          </nav>
          <p className="text-xs text-muted-foreground">{t("copyright", { year })}</p>
        </div>
      </div>

      <div className="border-t border-foreground/10">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 py-4 text-xs text-muted-foreground sm:px-6 lg:px-8">
          <Link href="/mentions-legales" className="hover:text-foreground">
            {t("legal.mentionsLegales")}
          </Link>
          <Link href="/confidentialite" className="hover:text-foreground">
            {t("legal.confidentialite")}
          </Link>
          <Link href="/conditions-utilisation" className="hover:text-foreground">
            {t("legal.conditionsUtilisation")}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
