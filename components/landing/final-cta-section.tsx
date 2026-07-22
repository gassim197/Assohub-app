import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { ScrollReveal } from "./scroll-reveal";

export async function FinalCtaSection() {
  const t = await getTranslations("landing.finalCta");

  return (
    <section className="bg-sidebar text-sidebar-foreground">
      <ScrollReveal className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("title")}</h2>
        <p className="mt-3 text-base text-sidebar-foreground/80 sm:text-lg">{t("subtitle")}</p>
        <Button
          size="lg"
          className="mt-8 w-full sm:w-auto"
          render={<Link href="/register" />}
        >
          {t("cta")}
        </Button>
      </ScrollReveal>
    </section>
  );
}
