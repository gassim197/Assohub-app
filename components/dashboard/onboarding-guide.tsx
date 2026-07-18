import Link from "next/link";
import { ArrowRight, Calendar, CreditCard, Rocket, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Card, CardContent } from "@/components/ui/card";

interface OnboardingStep {
  key: "members" | "cotisationTypes" | "firstMeeting";
  icon: typeof Users;
  href: string;
}

const STEPS: OnboardingStep[] = [
  { key: "members", icon: Users, href: "/members?new=true" },
  { key: "cotisationTypes", icon: CreditCard, href: "/cotisations?newType=true" },
  { key: "firstMeeting", icon: Calendar, href: "/meetings?newMeeting=true" },
];

/**
 * État A du tableau de bord (checkpoint 1, session 8A) : parcours de
 * démarrage guidé pour une organisation sans données, remplace l'ancien
 * empty state à cul-de-sac (un seul CTA "inviter un membre"). Chaque étape
 * pointe vers une modal de création déjà existante dans son module — mêmes
 * paramètres d'URL que les CTA de ces pages (`members?new=true`,
 * `cotisations?newType=true`, `meetings?newMeeting=true`), aucun nouveau
 * formulaire.
 */
export async function OnboardingGuide({ orgSlug }: { orgSlug: string }) {
  const t = await getTranslations("dashboard.onboarding");

  return (
    <div className="flex flex-col items-center py-8 text-center">
      <div className="mb-6 rounded-full bg-primary/10 p-4">
        <Rocket className="size-10 text-primary" />
      </div>
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="mt-3 max-w-sm text-muted-foreground">{t("subtitle")}</p>

      <div className="mt-10 grid w-full max-w-2xl gap-4 text-left sm:grid-cols-3">
        {STEPS.map((step) => (
          <Link key={step.key} href={`/${orgSlug}${step.href}`}>
            <Card className="h-full transition-shadow hover:shadow-card">
              <CardContent className="flex flex-col gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                  <step.icon className="size-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    {t(`steps.${step.key}.title`)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t(`steps.${step.key}.description`)}
                  </p>
                </div>
                <span className="flex items-center gap-1 text-sm font-medium text-primary">
                  {t(`steps.${step.key}.cta`)}
                  <ArrowRight className="size-3.5" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
