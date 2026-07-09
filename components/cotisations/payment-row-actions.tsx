"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";

import type { CotisationSummary, PaymentWithRecorderRow } from "@/lib/cotisations/payment-queries";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PaymentDetailDialog } from "./payment-detail-dialog";
import { DeletePaymentDialog } from "./delete-payment-dialog";

/**
 * Menu d'actions d'une ligne de l'historique des paiements (checkpoint 2,
 * session 5B). « Corriger » ouvre `RecordPaymentDialog` en mode édition
 * (`?editPayment=true&paymentId=X`, montée au niveau de la page). « Voir les
 * détails » et « Supprimer » sont contrôlés localement (contenu éphémère, pas
 * de deep-link).
 */
export function PaymentRowActions({
  orgSlug,
  payment,
  cotisation,
}: {
  orgSlug: string;
  payment: PaymentWithRecorderRow;
  cotisation: CotisationSummary;
}) {
  const t = useTranslations("cotisations.payments.rowActions");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  function openEdit() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("editPayment", "true");
    params.set("paymentId", payment.id);
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
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => setDetailOpen(true)}>
            {t("viewDetails")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openEdit}>{t("edit")}</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            {t("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <PaymentDetailDialog
        payment={payment}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
      <DeletePaymentDialog
        orgSlug={orgSlug}
        payment={payment}
        cotisation={cotisation}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}
