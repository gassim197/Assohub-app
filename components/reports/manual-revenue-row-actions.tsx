"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";

import type { TransactionWithRecorderRow } from "@/lib/reports/queries";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteTransactionDialog } from "./delete-transaction-dialog";

/**
 * Menu d'actions d'une ligne de revenu manuel (checkpoint 1). `listManualRevenues`
 * ne renvoie déjà que des lignes `payment_id IS NULL` — toujours éditables,
 * pas de garde supplémentaire nécessaire ici.
 */
export function ManualRevenueRowActions({
  orgSlug,
  revenue,
}: {
  orgSlug: string;
  revenue: TransactionWithRecorderRow;
}) {
  const t = useTranslations("reports.manualRevenues.rowActions");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [deleteOpen, setDeleteOpen] = useState(false);

  function openEdit() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("editRevenue", "true");
    params.set("transactionId", revenue.id);
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

      <DeleteTransactionDialog
        orgSlug={orgSlug}
        namespace="reports.manualRevenues"
        transaction={revenue}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}
