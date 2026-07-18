import Link from "next/link";
import { CalendarPlus, Link2, UserPlus, Wallet } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

interface QuickAction {
  key: "addMember" | "recordPayment" | "createMeeting" | "generateInviteLink";
  icon: typeof UserPlus;
  href: string;
}

const ACTIONS: QuickAction[] = [
  { key: "addMember", icon: UserPlus, href: "/members?new=true" },
  { key: "recordPayment", icon: Wallet, href: "/cotisations" },
  { key: "createMeeting", icon: CalendarPlus, href: "/meetings?newMeeting=true" },
  { key: "generateInviteLink", icon: Link2, href: "/members?generateLink=true" },
];

/**
 * Barre d'actions rapides du tableau de bord (checkpoint 2, session 8A) —
 * chaque bouton pointe vers une modal de création déjà existante dans son
 * module, aucun formulaire recodé. "Enregistrer un paiement" est la seule
 * exception : `RecordPaymentDialog` exige toujours un `cotisationId` précis
 * (aucune modal générique "choisir un membre" n'existe), le bouton amène
 * donc à l'onglet "Cotisations dues" où l'utilisateur choisit la ligne.
 */
export async function QuickActions({ orgSlug }: { orgSlug: string }) {
  const t = await getTranslations("dashboard.overview.quickActions");

  return (
    <div className="flex flex-wrap gap-2">
      {ACTIONS.map((action) => (
        <Button
          key={action.key}
          variant="outline"
          size="sm"
          render={<Link href={`/${orgSlug}${action.href}`} />}
        >
          <action.icon />
          {t(action.key)}
        </Button>
      ))}
    </div>
  );
}
