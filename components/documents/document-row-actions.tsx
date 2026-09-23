"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RenameDocumentDialog } from "./rename-document-dialog";
import { DeleteDocumentDialog } from "./delete-document-dialog";

export interface DocumentActionTarget {
  id: string;
  displayName: string;
}

/**
 * Téléchargement ouvert à tout membre (lien direct vers la route
 * authentifiée, pas de vérification de rôle). Renommer/supprimer réservés à
 * `canManage` (admin/owner, déjà vérifié côté serveur par la page parente —
 * ce booléen ne fait que masquer l'UI, `renameDocument`/`deleteDocument`
 * revérifient indépendamment).
 */
export function DocumentRowActions({
  orgSlug,
  document,
  canManage,
}: {
  orgSlug: string;
  document: DocumentActionTarget;
  canManage: boolean;
}) {
  const t = useTranslations("documents.rowActions");
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t("download")}
        render={<Link href={`/${orgSlug}/documents/${document.id}/download`} />}
      >
        <Download />
      </Button>

      {canManage ? (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-sm" aria-label={t("label")}>
                  <MoreHorizontal />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => setRenameOpen(true)}>
                {t("rename")}
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
              >
                {t("delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <RenameDocumentDialog
            orgSlug={orgSlug}
            document={document}
            open={renameOpen}
            onOpenChange={setRenameOpen}
          />
          <DeleteDocumentDialog
            orgSlug={orgSlug}
            document={document}
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
          />
        </>
      ) : null}
    </div>
  );
}
