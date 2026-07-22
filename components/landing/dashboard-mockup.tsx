import { BarChart2, Calendar, CreditCard, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { formatCurrency } from "@/lib/currency";
import { Logo } from "@/components/ui/logo";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Recréation HTML/CSS du tableau de bord (pas une capture d'écran) — hero de
 * la landing publique. Réutilise volontairement les mêmes classes que
 * `components/dashboard/dashboard-kpis.tsx` (Card size="sm", icônes, style
 * des valeurs) pour qu'elle ressemble fidèlement au vrai produit. Données
 * d'une association fictive, statiques (aucune requête, aucune interaction) —
 * idéalisées mais volontairement limitées aux 4 exemples du brief, sans
 * statistique supplémentaire inventée.
 */
export async function DashboardMockup() {
  const t = await getTranslations("landing.hero.mockup");

  return (
    <div
      aria-hidden="true"
      className="rounded-2xl border border-foreground/10 bg-card p-4 shadow-lg sm:p-6"
    >
      <div className="mb-4 flex items-center gap-2 border-b border-foreground/10 pb-4">
        <Logo variant="mark" className="size-7" />
        <div>
          <p className="text-sm font-semibold text-foreground">{t("orgName")}</p>
          <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card size="sm">
          <CardContent>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="size-4" />
              <p className="text-sm">{t("activeMembers")}</p>
            </div>
            <p className="mt-1 text-2xl font-semibold tabular-nums">47</p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CreditCard className="size-4" />
              <p className="text-sm">{t("outstanding")}</p>
            </div>
            <p className="mt-1 text-lg font-semibold tabular-nums sm:text-xl">
              {formatCurrency(125_000_000)}
            </p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent>
            <div className="flex items-center gap-2 text-muted-foreground">
              <BarChart2 className="size-4" />
              <p className="text-sm">{t("netBalance")}</p>
            </div>
            <p className="mt-1 text-lg font-semibold tabular-nums text-success sm:text-xl">
              {formatCurrency(320_000_000)}
            </p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="size-4" />
              <p className="text-sm">{t("nextMeeting")}</p>
            </div>
            <p className="mt-1 truncate text-base font-semibold text-foreground">
              {t("nextMeetingValue")}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
