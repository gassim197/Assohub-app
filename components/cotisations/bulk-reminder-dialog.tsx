"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Send } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { sendBulkPaymentReminders } from "@/lib/cotisations/reminder-actions";
import { isCotisationFrequency } from "@/lib/cotisations/constants";
import { formatPeriodLabel } from "@/lib/cotisations/period";
import type { RemindableCotisationRow } from "@/lib/cotisations/reminder-queries";
import { formatCurrency } from "@/lib/currency";
import { formatPhone } from "@/lib/phone";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { toast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

const WHATSAPP_GREEN = "#25D366";

/** Premier mot d'un nom complet. */
function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

/**
 * Bouton + modal de relance groupée (session 5C §4, checkpoint 2).
 *
 * Reçoit la liste des cotisations relançables déjà chargée par la page
 * parente (pour l'affichage du récap) — mais l'action serveur
 * `sendBulkPaymentReminders` ne prend aucun paramètre de liste : elle
 * revérifie systématiquement l'état frais côté serveur, jamais confiance
 * dans cette liste potentiellement périmée entre le chargement et le clic.
 */
export function BulkReminderTrigger({
  orgSlug,
  organizationName,
  remindable,
}: {
  orgSlug: string;
  organizationName: string;
  remindable: RemindableCotisationRow[];
}) {
  const t = useTranslations("cotisations.reminders.bulk");
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const count = remindable.length;
  const withEmail = remindable.filter((row) => row.memberEmail);
  const withoutEmail = remindable.filter((row) => !row.memberEmail);

  if (count === 0) return null;

  function onConfirm() {
    startTransition(async () => {
      const result = await sendBulkPaymentReminders(orgSlug);

      if (!result.ok) {
        toast.error(t("errors.generic"));
        return;
      }

      toast.success(
        t("success", {
          sent: result.sentCount,
          failed: result.failedCount,
          noEmail: result.noEmailCount,
        }),
      );
      setOpen(false);
      router.refresh();
    });
  }

  function remainingLabelFor(row: RemindableCotisationRow): string {
    return formatCurrency(Math.max(0, row.dueAmount - row.paidAmount), locale);
  }

  function periodLabelFor(row: RemindableCotisationRow): string {
    const frequency = isCotisationFrequency(row.frequency) ? row.frequency : "monthly";
    return formatPeriodLabel(row.periodStart, frequency, locale);
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Send />
        {t("trigger", { count })}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("dialog.title")}</DialogTitle>
            <DialogDescription>{t("dialog.intro", { count })}</DialogDescription>
          </DialogHeader>

          <div className="max-h-[50vh] space-y-4 overflow-y-auto pr-1">
            {withEmail.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  {t("dialog.willReceiveTitle", { count: withEmail.length })}
                </p>
                <ul className="space-y-1.5">
                  {withEmail.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-foreground/10 px-3 py-2 text-sm"
                    >
                      <span className="text-foreground">{row.memberFullName}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {remainingLabelFor(row)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {withoutEmail.length > 0 ? (
              <div>
                {withEmail.length > 0 ? <Separator className="mb-4" /> : null}
                <p className="mb-2 text-xs font-medium text-warning">
                  {t("dialog.noEmailTitle", { count: withoutEmail.length })}
                </p>
                <ul className="space-y-1.5">
                  {withoutEmail.map((row) => {
                    const message = t("dialog.whatsappMessage", {
                      name: firstName(row.memberFullName),
                      type: row.typeName,
                      period: periodLabelFor(row),
                      amount: remainingLabelFor(row),
                      orgName: organizationName,
                    });
                    const whatsappUrl = buildWhatsAppUrl(row.memberPhone, message);
                    return (
                      <li
                        key={row.id}
                        className="flex items-center justify-between gap-2 rounded-md border border-foreground/10 px-3 py-2 text-sm"
                      >
                        <div>
                          <span className="block text-foreground">{row.memberFullName}</span>
                          <span className="block text-xs text-muted-foreground">
                            {formatPhone(row.memberPhone)}
                          </span>
                        </div>
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-white shadow-sm transition-opacity hover:opacity-90"
                          style={{ backgroundColor: WHATSAPP_GREEN }}
                        >
                          <MessageCircle className="size-3.5" />
                          {t("dialog.whatsappButton")}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              {t("dialog.cancel")}
            </Button>
            <Button
              type="button"
              onClick={onConfirm}
              disabled={isPending || withEmail.length === 0}
            >
              {isPending
                ? t("dialog.submitting")
                : t("dialog.submit", { count: withEmail.length })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
