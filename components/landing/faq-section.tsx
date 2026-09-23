import { getTranslations } from "next-intl/server";

import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollReveal } from "./scroll-reveal";

const FAQ_KEYS = ["securite", "simplicite", "organisations", "paiements"] as const;

export async function FaqSection() {
  const t = await getTranslations("landing.faq");

  return (
    <section
      id="faq"
      className="mx-auto max-w-3xl scroll-mt-28 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
    >
      <ScrollReveal>
        <h2 className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {t("title")}
        </h2>

        <Accordion className="mt-10">
          {FAQ_KEYS.map((key) => (
            <AccordionItem key={key} value={key}>
              <AccordionTrigger>{t(`questions.${key}.question`)}</AccordionTrigger>
              <AccordionPanel>{t(`questions.${key}.answer`)}</AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
      </ScrollReveal>
    </section>
  );
}
