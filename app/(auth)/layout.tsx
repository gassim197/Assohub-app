import { getTranslations } from "next-intl/server";

import { Logo } from "@/components/ui/logo";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("auth");

  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo variant="full" />
          <p className="text-sm text-muted-foreground max-w-xs">
            {t("tagline")}
          </p>
        </div>
        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}
