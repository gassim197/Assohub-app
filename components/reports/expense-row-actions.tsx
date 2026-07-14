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
 * Menu d'actions d'une ligne de dépense (checkpoint 1). Toutes les dépenses
 * sont des saisies manuelles (`payment_id` n'existe pas pour `type =
 * 'expense'`) — pas de garde d'éditabilité nécessaire ici, contrairement à
 * l'onglet Transactions (checkpoint 3) qui mélange revenus auto et manuels.
 */
export function ExpenseRowActions({
  orgSlug,
  expense,
}: {
  orgSlug: string;
  expense: TransactionWithRecorderRow;
}) {
  const t = useTranslations("reports.expenses.rowActions");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [deleteOpen, setDeleteOpen] = useState(false);

  function openEdit() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("editExpense", "true");
    params.set("transactionId", expense.id);
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
        namespace="reports.expenses"
        transaction={expense}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}
