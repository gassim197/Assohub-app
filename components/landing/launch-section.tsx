import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";

export async function LaunchSection() {
  const t = await getTranslations("landing.launch");

  return (
    <section aria-labelledby="launch-title" className="border-t border-foreground/10 bg-brand-subtle/50">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8">
        <div className="flex items-center gap-5">
          <span className="text-6xl font-bold tracking-tight text-primary">14</span>
          <p className="max-w-sm text-base leading-relaxed text-muted-foreground">
            {t("pilots")}
          </p>
        </div>
        <div>
          <h2 id="launch-title" className="text-xl font-semibold text-primary sm:text-2xl">
            {t("title")}
          </h2>
          <p className="mt-2 text-base leading-relaxed text-muted-foreground">{t("description")}</p>
          <Link href="#documents" className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
            {t("link")}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
