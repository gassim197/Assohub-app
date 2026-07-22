"use client";

import { useTranslations } from "next-intl";

import type { SoleOwnedOrganization } from "@/lib/organizations/queries";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SoleOwnerBlockerDialogProps {
  organizations: SoleOwnedOrganization[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Bloque la suppression de compte tant que l'utilisateur reste seul
 * propriétaire d'une ou plusieurs organisations (pas de transfert de
 * propriété en V1, `lib/organizations/queries.ts::getUserSoleOwnedOrganizations`).
 */
export function SoleOwnerBlockerDialog({
  organizations,
  open,
  onOpenChange,
}: SoleOwnerBlockerDialogProps) {
  const t = useTranslations("settings.dangerZone.soleOwnerDialog");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("description")}</AlertDialogDescription>
        </AlertDialogHeader>

        <ul className="list-inside list-disc space-y-1 text-sm text-foreground">
          {organizations.map((org) => (
            <li key={org.id}>{org.name}</li>
          ))}
        </ul>

        <AlertDialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            {t("close")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
