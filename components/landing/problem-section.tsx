import { NotebookPen, SearchX, ShieldAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Card, CardContent } from "@/components/ui/card";
import { ScrollReveal } from "./scroll-reveal";

// Classes littérales (pas de gabarit dynamique `delay-${n}`) — Tailwind ne
// génère que les classes qu'il peut détecter statiquement dans le code.
const PAINS = [
  { key: "notebook", Icon: NotebookPen, delay: "" },
  { key: "tracking", Icon: SearchX, delay: "delay-100" },
  { key: "trust", Icon: ShieldAlert, delay: "delay-200" },
] as const;

export async function ProblemSection() {
  const t = await getTranslations("landing.problem");

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <ScrollReveal>
        <h2 className="max-w-2xl text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {t("title")}
        </h2>
      </ScrollReveal>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {PAINS.map(({ key, Icon, delay }) => (
          <ScrollReveal key={key} className={delay}>
            <Card>
              <CardContent>
                <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <Icon className="size-5" />
                </div>
                <p className="text-sm leading-relaxed text-foreground">
                  {t(`pains.${key}`)}
                </p>
              </CardContent>
            </Card>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
