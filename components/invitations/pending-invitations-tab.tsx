import { getLocale, getTranslations } from "next-intl/server";

import type { PendingInvitationRow } from "@/lib/invitations/queries";
import { invitationStatus } from "@/lib/invitations/constants";
import { isMemberRole } from "@/lib/members/constants";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InvitationRowActions } from "./invitation-row-actions";

/**
 * Contenu de l'onglet "Invitations en attente" (schema-design §4.4, volet 1
 * de la 4B). Server Component : les lignes sont déjà chargées par la page
 * parente (`requireOrgAccess` + `listPendingInvitations`), scoping tenant
 * garanti en amont.
 */
export async function PendingInvitationsTab({
  orgSlug,
  invitations,
}: {
  orgSlug: string;
  invitations: PendingInvitationRow[];
}) {
  const [t, tMembers, locale] = await Promise.all([
    getTranslations("invitations"),
    getTranslations("members"),
    getLocale(),
  ]);

  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  function roleLabel(role: string): string {
    return isMemberRole(role) ? tMembers(`roles.${role}`) : role;
  }

  if (invitations.length === 0) {
    return (
      <Card className="px-6 py-16 text-center text-sm text-muted-foreground">
        {t("tab.empty")}
      </Card>
    );
  }

  return (
    <Card className="py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("tab.table.name")}</TableHead>
            <TableHead>{t("tab.table.email")}</TableHead>
            <TableHead>{t("tab.table.role")}</TableHead>
            <TableHead>{t("tab.table.status")}</TableHead>
            <TableHead>{t("tab.table.expiresAt")}</TableHead>
            <TableHead className="w-12 text-right">
              <span className="sr-only">{t("tab.actions.label")}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invitations.map((invitation) => {
            const statusValue = invitationStatus(invitation);
            return (
              <TableRow key={invitation.id}>
                <TableCell className="font-medium text-foreground">
                  {invitation.fullName}
                </TableCell>
                <TableCell>{invitation.email}</TableCell>
                <TableCell>{roleLabel(invitation.intendedRole)}</TableCell>
                <TableCell>
                  <Badge variant={statusValue === "expired" ? "warning" : "info"}>
                    {statusValue === "expired"
                      ? t("tab.status.expired")
                      : t("tab.status.pending")}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground tabular-nums">
                  {dateFormatter.format(invitation.expiresAt)}
                </TableCell>
                <TableCell className="text-right">
                  <InvitationRowActions
                    orgSlug={orgSlug}
                    invitation={{ id: invitation.id, email: invitation.email }}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
