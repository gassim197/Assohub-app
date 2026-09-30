import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { ScrollReveal } from "./scroll-reveal";
import { SupportLink } from "./support-link";

export async function FinalCtaSection() {
  const t = await getTranslations("landing.finalCta");

  return (
    <section className="bg-sidebar text-sidebar-foreground">
      <ScrollReveal className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("title")}</h2>
        <p className="mt-3 text-base text-sidebar-foreground/80 sm:text-lg">{t("subtitle")}</p>
        <Button
          size="lg"
          className="mt-8 min-h-12 w-full border-white/30 bg-white px-5 text-primary hover:bg-white/90 sm:w-auto"
          render={<Link href="/register" />}
        >
          {t("cta")}
        </Button>
        <p className="mt-3 text-sm text-sidebar-foreground/70">{t("freeNote")}</p>
        <SupportLink className="mt-3 text-white" />
      </ScrollReveal>
    </section>
  );
}
