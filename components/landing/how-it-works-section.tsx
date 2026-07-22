import { getTranslations } from "next-intl/server";

import { ScrollReveal } from "./scroll-reveal";

const STEP_KEYS = ["createOrg", "addMembers", "manage"] as const;

export async function HowItWorksSection() {
  const t = await getTranslations("landing.howItWorks");

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <ScrollReveal>
        <h2 className="max-w-2xl text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {t("title")}
        </h2>
      </ScrollReveal>

      <div className="mt-10 grid gap-8 sm:grid-cols-3">
        {STEP_KEYS.map((key, index) => (
          <ScrollReveal key={key}>
            <div className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {index + 1}
            </div>
            <h3 className="mt-3 font-heading text-base font-semibold text-foreground">
              {t(`steps.${key}.title`)}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {t(`steps.${key}.description`)}
            </p>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
