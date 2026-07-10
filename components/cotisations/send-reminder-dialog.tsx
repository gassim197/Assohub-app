"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { sendPaymentReminder } from "@/lib/cotisations/reminder-actions";
import { isCotisationFrequency } from "@/lib/cotisations/constants";
import { formatPeriodLabel } from "@/lib/cotisations/period";
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

// Couleur officielle WhatsApp — même exception que `whatsapp-share-button.tsx`.
const WHATSAPP_GREEN = "#25D366";

export interface ReminderCotisationTarget {
  id: string;
  memberFullName: string;
  memberEmail: string | null;
  memberPhone: string;
  typeName: string;
  frequency: string;
  periodStart: string;
  dueAmount: number;
  paidAmount: number;
}

/** Premier mot d'un nom complet, pour les formules de politesse et messages. */
function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

/**
 * Modal de relance individuelle (session 5C §3). Branche son contenu selon
 * que le membre a un email enregistré ou non — état local (comme
 * `PaymentRowActions`), pas piloté par l'URL : contenu éphémère par ligne.
 */
export function SendReminderDialog({
  orgSlug,
  organizationName,
  cotisation,
  open,
  onOpenChange,
}: {
  orgSlug: string;
  organizationName: string;
  cotisation: ReminderCotisationTarget;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("cotisations.reminders");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const frequency = isCotisationFrequency(cotisation.frequency)
    ? cotisation.frequency
    : "monthly";
  const periodLabel = formatPeriodLabel(cotisation.periodStart, frequency, locale);
  const remaining = Math.max(0, cotisation.dueAmount - cotisation.paidAmount);
  const remainingLabel = formatCurrency(remaining, locale);
  const memberFirstName = firstName(cotisation.memberFullName);

  function onConfirm() {
    startTransition(async () => {
      const result = await sendPaymentReminder(orgSlug, cotisation.id);

      if (result.ok) {
        toast.success(t("dialog.success", { member: cotisation.memberFullName }));
        onOpenChange(false);
        router.refresh();
        return;
      }

      if (result.error === "notRemindable") {
        toast.error(t("dialog.errors.notRemindable"));
      } else if (result.error === "noEmail") {
        toast.error(t("dialog.errors.noEmail"));
      } else {
        toast.error(t("dialog.errors.generic"));
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  if (!cotisation.memberEmail) {
    const message = t("whatsappMessage", {
      name: memberFirstName,
      type: cotisation.typeName,
      period: periodLabel,
      amount: remainingLabel,
      orgName: organizationName,
    });
    const whatsappUrl = buildWhatsAppUrl(cotisation.memberPhone, message);

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("noEmailDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("noEmailDialog.description", {
                name: cotisation.memberFullName,
                phone: formatPhone(cotisation.memberPhone),
              })}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("noEmailDialog.close")}
            </Button>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: WHATSAPP_GREEN }}
            >
              <MessageCircle className="size-4" />
              {t("noEmailDialog.whatsappButton")}
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("dialog.title")}</DialogTitle>
          <DialogDescription>
            {t("dialog.confirmQuestion", {
              member: cotisation.memberFullName,
              type: cotisation.typeName,
              period: periodLabel,
              amount: remainingLabel,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-foreground/10 bg-muted/30 p-3">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            {t("dialog.messagePreviewLabel")}
          </p>
          <p className="text-sm whitespace-pre-line text-foreground italic">
            {t("dialog.messagePreviewText", {
              firstName: memberFirstName,
              type: cotisation.typeName,
              period: periodLabel,
              amount: remainingLabel,
              orgName: organizationName,
            })}
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t("dialog.cancel")}
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isPending}>
            {isPending ? t("dialog.submitting") : t("dialog.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
