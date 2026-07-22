import { BarChart2, Calendar, CreditCard, LayoutDashboard, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Card, CardContent } from "@/components/ui/card";
import { ScrollReveal } from "./scroll-reveal";

// Mêmes icônes que la nav du produit (`components/layout/sidebar.tsx`) —
// cohérence de l'iconographie entre la landing et l'app réelle. Classes de
// délai littérales (pas de gabarit dynamique `delay-${n}`) — Tailwind ne
// génère que les classes qu'il peut détecter statiquement dans le code.
const MODULES = [
  { key: "members", Icon: Users, delay: "" },
  { key: "cotisations", Icon: CreditCard, delay: "delay-75" },
  { key: "meetings", Icon: Calendar, delay: "delay-100" },
  { key: "reports", Icon: BarChart2, delay: "delay-150" },
  { key: "dashboard", Icon: LayoutDashboard, delay: "delay-200 sm:col-span-2 lg:col-span-1" },
] as const;

export async function SolutionSection() {
  const t = await getTranslations("landing.solution");

  return (
    <section id="solution" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <ScrollReveal>
        <h2 className="max-w-2xl text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {t("title")}
        </h2>
      </ScrollReveal>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map(({ key, Icon, delay }) => (
          <ScrollReveal key={key} className={delay}>
            <Card>
              <CardContent>
                <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-brand-subtle text-primary">
                  <Icon className="size-5" />
                </div>
                <h3 className="font-heading text-base font-semibold text-foreground">
                  {t(`modules.${key}.title`)}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {t(`modules.${key}.description`)}
                </p>
              </CardContent>
            </Card>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
