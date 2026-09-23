"use client";

import { useState } from "react";
import Link from "next/link";
import { Paperclip } from "lucide-react";
import { useTranslations } from "next-intl";

import type { AttachedDocumentRow } from "@/lib/documents/queries";
import { Button } from "@/components/ui/button";
import { AttachDocumentDialog } from "@/components/documents/attach-document-dialog";

/**
 * Cellule « Justificatif » d'une ligne de l'historique des paiements
 * (checkpoint validé : pas de page de détail de paiement, le rattachement
 * vit ici plutôt que sur une page inexistante). Affiche un lien de
 * téléchargement si un document est déjà attaché ; sinon, pour admin/owner
 * uniquement, un bouton « Joindre » ouvrant `AttachDocumentDialog`. Un simple
 * membre sans document attaché voit un tiret.
 */
export function PaymentAttachmentCell({
  orgSlug,
  paymentId,
  document,
  canManage,
  existingDocuments,
}: {
  orgSlug: string;
  paymentId: string;
  document: AttachedDocumentRow | undefined;
  canManage: boolean;
  existingDocuments: AttachedDocumentRow[];
}) {
  const t = useTranslations("cotisations.payments.attachment");
  const [open, setOpen] = useState(false);

  if (document) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-auto px-1.5 py-1 font-normal text-muted-foreground"
        render={<Link href={`/${orgSlug}/documents/${document.id}/download`} />}
      >
        <Paperclip className="size-3.5" />
        <span className="max-w-32 truncate">{document.displayName}</span>
      </Button>
    );
  }

  if (!canManage) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {t("attach")}
      </Button>
      <AttachDocumentDialog
        orgSlug={orgSlug}
        target={{ paymentId }}
        existingDocuments={existingDocuments}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
