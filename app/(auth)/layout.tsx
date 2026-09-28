import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { Logo } from "@/components/ui/logo";
import { SupportLink } from "@/components/landing/support-link";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("auth");

  return (
    <div className="brand-public min-h-screen bg-muted/40 text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Link href="/" aria-label={t("backToHome")} className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
            <Logo variant="full" />
          </Link>
          <p className="text-sm text-muted-foreground max-w-xs">
            {t("tagline")}
          </p>
        </div>
        <div className="w-full">{children}</div>
        <SupportLink className="text-primary" />
      </div>
    </div>
  );
}
