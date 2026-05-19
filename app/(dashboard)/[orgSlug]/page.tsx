import Link from "next/link";
import { Users } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

export default async function DashboardHomePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const t = await getTranslations("dashboard");

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="rounded-full bg-primary/10 p-4 mb-6">
        <Users className="size-10 text-primary" />
      </div>
      <h1 className="text-3xl font-bold">{t("emptyTitle")}</h1>
      <p className="mt-3 text-muted-foreground max-w-sm">{t("emptySubtitle")}</p>
      <Button
        render={<Link href={`/${orgSlug}/members?new=true`} />}
        className="mt-8"
      >
        {t("ctaInvite")}
      </Button>
    </div>
  );
}
