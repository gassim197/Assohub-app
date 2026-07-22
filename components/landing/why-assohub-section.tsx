import { MessageCircle, ShieldCheck, Smartphone, Wallet } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ScrollReveal } from "./scroll-reveal";

const REASONS = [
  { key: "mobileMoney", Icon: Wallet },
  { key: "whatsapp", Icon: MessageCircle },
  { key: "mobileFirst", Icon: Smartphone },
  { key: "security", Icon: ShieldCheck },
] as const;

export async function WhyAssoHubSection() {
  const t = await getTranslations("landing.whyUs");

  return (
    <section className="bg-muted/40">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <ScrollReveal>
          <h2 className="max-w-2xl text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {t("title")}
          </h2>
        </ScrollReveal>

        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {REASONS.map(({ key, Icon }) => (
            <ScrollReveal key={key}>
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
              <h3 className="mt-3 font-heading text-base font-semibold text-foreground">
                {t(`reasons.${key}.title`)}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {t(`reasons.${key}.description`)}
              </p>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
