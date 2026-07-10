"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";

import { todayISO } from "@/lib/cotisations/period";
import type { CotisationWithRelationsRow } from "@/lib/cotisations/queries";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SendReminderDialog } from "./send-reminder-dialog";

/** Même prédicat de relançabilité que `reminder-queries.ts` (5C §1), côté UI. */
function isRemindable(row: CotisationWithRelationsRow): boolean {
  return row.status === "en_retard" || (row.status === "partiel" && row.dueDate < todayISO());
}

/**
 * Menu d'actions d'une ligne de l'onglet "Cotisations dues".
 *
 * « Enregistrer un paiement » ouvre la modal d'encaissement en place
 * (`?recordPayment=true&cotisationId=X`, checkpoint 1 5B) — désactivé quand
 * il ne reste rien à percevoir (`remaining <= 0`, cotisation déjà `paye`,
 * visible seulement via le toggle "Inclure les cotisations soldées").
 *
 * « Voir les détails » navigue vers la fiche cotisation
 * (`/[orgSlug]/cotisations/[cotisationId]`, checkpoint 2 5B).
 *
 * « Envoyer un rappel » (session 5C §3) : visible uniquement si la cotisation
 * est relançable (même règle que `reminder-queries.ts` — vérifiée à nouveau
 * côté serveur avant l'envoi, ce contrôle client n'est qu'une aide visuelle).
 * État local (comme `PaymentRowActions`), pas piloté par l'URL.
 */
export function CotisationsDueRowActions({
  orgSlug,
  organizationName,
  row,
}: {
  orgSlug: string;
  organizationName: string;
  row: CotisationWithRelationsRow;
}) {
  const t = useTranslations("cotisations.due.rowActions");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [reminderOpen, setReminderOpen] = useState(false);

  const remaining = row.dueAmount - row.paidAmount;

  function openRecordPayment() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("recordPayment", "true");
    params.set("cotisationId", row.id);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label={t("label")}>
              <MoreHorizontal />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem
            render={<Link href={`/${orgSlug}/cotisations/${row.id}`} />}
          >
            {t("viewDetails")}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={remaining <= 0}
            onClick={openRecordPayment}
          >
            {t("recordPayment")}
          </DropdownMenuItem>
          {isRemindable(row) ? (
            <DropdownMenuItem onClick={() => setReminderOpen(true)}>
              {t("sendReminder")}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <SendReminderDialog
        orgSlug={orgSlug}
        organizationName={organizationName}
        cotisation={row}
        open={reminderOpen}
        onOpenChange={setReminderOpen}
      />
    </>
  );
}
