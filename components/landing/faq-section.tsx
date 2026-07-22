import { getTranslations } from "next-intl/server";

import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollReveal } from "./scroll-reveal";

const FAQ_KEYS = ["q1", "q2", "q3", "q4", "q5"] as const;

export async function FaqSection() {
  const t = await getTranslations("landing.faq");

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
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
