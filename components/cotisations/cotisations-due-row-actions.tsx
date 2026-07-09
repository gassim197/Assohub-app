"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Menu d'actions d'une ligne de l'onglet "Cotisations dues".
 *
 * « Enregistrer un paiement » ouvre la modal d'encaissement en place
 * (`?recordPayment=true&cotisationId=X`, checkpoint 1 5B) — désactivé quand
 * il ne reste rien à percevoir (`remaining <= 0`, cotisation déjà `paye`,
 * visible seulement via le toggle "Inclure les cotisations soldées").
 *
 * « Voir les détails » navigue vers la fiche cotisation
 * (`/[orgSlug]/cotisations/[cotisationId]`, checkpoint 2 5B) — remplace le
 * renvoi temporaire vers la fiche membre du checkpoint 1.
 */
export function CotisationsDueRowActions({
  orgSlug,
  cotisationId,
  remaining,
}: {
  orgSlug: string;
  cotisationId: string;
  remaining: number;
}) {
  const t = useTranslations("cotisations.due.rowActions");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function openRecordPayment() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("recordPayment", "true");
    params.set("cotisationId", cotisationId);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
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
          render={<Link href={`/${orgSlug}/cotisations/${cotisationId}`} />}
        >
          {t("viewDetails")}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={remaining <= 0}
          onClick={openRecordPayment}
        >
          {t("recordPayment")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
