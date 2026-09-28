import { getTranslations } from "next-intl/server";
import { Mail } from "lucide-react";
import { cn } from "@/lib/utils";

/** Public contact already published in the site's legal notice. */
export const SUPPORT_HREF = "mailto:fondateur@assohub-gn.com";

export async function SupportLink({ className }: { className?: string }) {
  const t = await getTranslations("landing.support");

  return (
    <a href={SUPPORT_HREF} className={cn("inline-flex min-h-11 items-center gap-2 rounded-sm text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current", className)}>
      <Mail aria-hidden="true" className="size-4 shrink-0" />
      {t("start")}
    </a>
  );
}
