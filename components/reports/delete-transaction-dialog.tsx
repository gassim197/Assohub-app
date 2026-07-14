"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { softDeleteTransaction } from "@/lib/reports/actions";
import { formatCurrency } from "@/lib/currency";
import { toast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface DeletableTransaction {
  id: string;
  amount: number;
  description: string;
}

/**
 * Confirmation de suppression (soft delete) d'une dépense ou d'un revenu
 * manuel — partagée par les deux onglets (`namespace` sélectionne les
 * libellés). `softDeleteTransaction` refuse déjà côté serveur une
 * transaction liée à un paiement de cotisation ; ce dialog n'est de toute
 * façon jamais monté pour ces lignes (pas de bouton "Supprimer" proposé).
 */
export function DeleteTransactionDialog({
  orgSlug,
  namespace,
  transaction,
  open,
  onOpenChange,
}: {
  orgSlug: string;
  namespace: "reports.expenses" | "reports.manualRevenues";
  transaction: DeletableTransaction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations(`${namespace}.deleteDialog`);
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onConfirm() {
    startTransition(async () => {
      const result = await softDeleteTransaction(orgSlug, transaction.id);

      if (result.ok) {
        toast.success(t("success"));
        onOpenChange(false);
        router.refresh();
        return;
      }

      toast.error(
        result.error === "linkedToPayment" ? t("errorLinkedToPayment") : t("error"),
      );
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("description", {
              description: transaction.description,
              amount: formatCurrency(transaction.amount, locale),
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? t("submitting") : t("confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
