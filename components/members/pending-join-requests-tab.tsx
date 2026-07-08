import { getLocale, getTranslations } from "next-intl/server";

import type { MemberRow } from "@/lib/members/queries";
import { isMemberRole } from "@/lib/members/constants";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPhone } from "@/lib/phone";
import { JoinRequestRowActions } from "./join-request-row-actions";

/**
 * Contenu de l'onglet "Demandes d'adhésion" (volet 4 de la 4B, checkpoint 3) :
 * inscriptions via lien partageable en mode "validation manuelle", en attente
 * d'approbation. Server Component : les lignes sont déjà chargées par la page
 * parente (`requireOrgAccess` + `listPendingJoinRequests`).
 */
export async function PendingJoinRequestsTab({
  orgSlug,
  requests,
}: {
  orgSlug: string;
  requests: MemberRow[];
}) {
  const [t, tMembers, locale] = await Promise.all([
    getTranslations("members.joinRequests"),
    getTranslations("members"),
    getLocale(),
  ]);

  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  function roleLabel(role: string): string {
    return isMemberRole(role) ? tMembers(`roles.${role}`) : role;
  }

  if (requests.length === 0) {
    return (
      <Card className="px-6 py-16 text-center text-sm text-muted-foreground">
        {t("empty")}
      </Card>
    );
  }

  return (
    <Card className="py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("table.name")}</TableHead>
            <TableHead>{t("table.contact")}</TableHead>
            <TableHead>{t("table.role")}</TableHead>
            <TableHead>{t("table.requestedAt")}</TableHead>
            <TableHead className="w-12 text-right">
              <span className="sr-only">{t("actions.label")}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id}>
              <TableCell className="font-medium text-foreground">
                {request.fullName}
              </TableCell>
              <TableCell>
                <span className="block">{request.email}</span>
                <span className="block text-xs text-muted-foreground">
                  {formatPhone(request.phoneNumber)}
                </span>
              </TableCell>
              <TableCell>{roleLabel(request.role)}</TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {dateFormatter.format(request.createdAt)}
              </TableCell>
              <TableCell className="text-right">
                <JoinRequestRowActions
                  orgSlug={orgSlug}
                  request={{ id: request.id, fullName: request.fullName }}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
