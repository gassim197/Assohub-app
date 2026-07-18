import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";

import { auth } from "@/lib/auth";
import { requireOrgAccess } from "@/lib/auth/org";
import { getMemberKpis } from "@/lib/members/queries";
import { getCotisationKpis, listCotisationsDue } from "@/lib/cotisations/queries";
import { getFinancialKpis } from "@/lib/reports/queries";
import { resolveReportsPeriod } from "@/lib/reports/period";
import { listUpcomingMeetings } from "@/lib/meetings/queries";
import { DashboardKpis } from "@/components/dashboard/dashboard-kpis";
import { OnboardingGuide } from "@/components/dashboard/onboarding-guide";
import { UpcomingMeetingsSection } from "@/components/dashboard/upcoming-meetings-section";
import { OverdueCotisationsSection } from "@/components/dashboard/overdue-cotisations-section";
import { QuickActions } from "@/components/dashboard/quick-actions";

export default async function DashboardHomePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const { organizationId, organization } = await requireOrgAccess(orgSlug);

  const [session, t, locale] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getTranslations("dashboard.overview"),
    getLocale(),
  ]);
  const firstName = session?.user.name?.split(" ")[0] ?? organization.name;

  // Une seule vague de requêtes, réutilisant les agrégats déjà existants de
  // chaque module — sert à la fois aux 4 KPI cards ET à la détection
  // État A (onboarding) / État B (tableau de bord riche) ci-dessous, sans
  // requête dédiée supplémentaire.
  const [memberKpis, cotisationKpis, financialKpis, upcomingMeetings] = await Promise.all([
    getMemberKpis(organizationId),
    getCotisationKpis(organizationId),
    getFinancialKpis(organizationId, resolveReportsPeriod("thisYear")),
    listUpcomingMeetings({ organizationId }),
  ]);

  // `activeTotal` inclut déjà le fondateur (auto-créé avec `status: "actif"`) —
  // le seuil est donc `> 1`, pas `> 0`. Pas de vérification séparée des
  // réunions passées : une organisation qui n'aurait que des réunions
  // passées et rien d'autre est un cas limite qui n'arrive pas en pratique
  // (elle aurait alors nécessairement des membres ou des cotisations).
  const isActive =
    memberKpis.activeTotal > 1 ||
    cotisationKpis.outstanding > 0 ||
    cotisationKpis.lateCount > 0 ||
    cotisationKpis.upToDateCount > 0 ||
    upcomingMeetings.length > 0;

  if (!isActive) {
    return <OnboardingGuide orgSlug={orgSlug} />;
  }

  // Non chargée avant la bascule État A / État B : inutile pour la
  // détection (déjà tranchée ci-dessus par `cotisationKpis`), seulement
  // pour l'aperçu "Cotisations en retard" de l'état actif.
  const overdueResult = await listCotisationsDue({
    organizationId,
    status: "en_retard",
    page: 1,
  });

  const todayLabel = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("greeting", { firstName })}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground capitalize">{todayLabel}</p>
      </div>

      <QuickActions orgSlug={orgSlug} />

      <DashboardKpis
        memberKpis={memberKpis}
        cotisationKpis={cotisationKpis}
        financialKpis={financialKpis}
        nextMeeting={upcomingMeetings[0] ?? null}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <UpcomingMeetingsSection orgSlug={orgSlug} meetings={upcomingMeetings} />
        <OverdueCotisationsSection orgSlug={orgSlug} overdue={overdueResult.rows} />
      </div>
    </div>
  );
}
