import Link from "next/link";
import { Download, Mail, Plus, Upload, Users } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { requireOrgAccess } from "@/lib/auth/org";
import {
  getMemberById,
  getMemberKpis,
  listMembers,
  listPendingJoinRequests,
} from "@/lib/members/queries";
import {
  STATUS_BADGE_VARIANT,
  STATUS_I18N_KEY,
  isMemberRole,
  isMemberStatus,
  type MemberStatus,
} from "@/lib/members/constants";
import { formatPhone } from "@/lib/phone";
import {
  countActuallyPending,
  getActiveOrganizationInviteLink,
  listPendingInvitations,
} from "@/lib/invitations/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MembersPagination } from "@/components/members/members-pagination";
import { MembersToolbar } from "@/components/members/members-toolbar";
import { MemberFormDialog } from "@/components/members/member-form-dialog";
import { MemberRowActions } from "@/components/members/member-row-actions";
import { PendingJoinRequestsTab } from "@/components/members/pending-join-requests-tab";
import { InviteMemberDialog } from "@/components/invitations/invite-member-dialog";
import { PendingInvitationsTab } from "@/components/invitations/pending-invitations-tab";
import { InviteLinkTab } from "@/components/invitations/invite-link-tab";
import { GenerateInviteLinkDialog } from "@/components/invitations/generate-invite-link-dialog";

type SearchParams = Record<string, string | string[] | undefined>;

function readParam(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/** Statut demandé par l'URL, normalisé. Défaut métier : "actif". */
function parseStatus(value: string | undefined): MemberStatus | "all" {
  if (value === "all") return "all";
  if (value && isMemberStatus(value)) return value;
  return "actif";
}

export default async function MembersPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const { organizationId, organization } = await requireOrgAccess(orgSlug);

  const [t, tc, locale] = await Promise.all([
    getTranslations("members"),
    getTranslations("common"),
    getLocale(),
  ]);

  const search = readParam(sp.search);
  const status = parseStatus(readParam(sp.status));
  const page = Math.max(1, Number(readParam(sp.page)) || 1);

  const [kpis, list, invitations, activeInviteLink, joinRequests] = await Promise.all([
    getMemberKpis(organizationId),
    listMembers({ organizationId, status, search, page }),
    listPendingInvitations(organizationId),
    getActiveOrganizationInviteLink(organizationId),
    listPendingJoinRequests(organizationId),
  ]);
  const pendingInvitationsCount = countActuallyPending(invitations);

  // Édition en place : `?edit=true&memberId=X` monte la modal pré-remplie. La
  // résolution passe par getMemberById (borné au tenant) plutôt que par la page
  // courante, pour fonctionner même si le membre n'est pas dans les résultats filtrés.
  const editMemberId = sp.edit === "true" ? readParam(sp.memberId) : undefined;
  const editMember = editMemberId
    ? await getMemberById(organizationId, editMemberId)
    : null;

  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  function formatJoined(value: string | null): string {
    if (!value) return "—";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : dateFormatter.format(parsed);
  }

  function roleLabel(role: string, customRole: string | null): string {
    if (role === "autre" && customRole?.trim()) return customRole;
    return isMemberRole(role) ? t(`roles.${role}`) : role;
  }

  const kpiCards = [
    { key: "total", label: t("kpis.total"), value: kpis.total },
    { key: "active", label: t("kpis.active"), value: kpis.activeTotal },
    { key: "new30d", label: t("kpis.new30d"), value: kpis.new30d },
  ];

  // Annuaire vide (aucun membre, tous statuts confondus) → empty state engageant.
  const directoryEmpty = kpis.total === 0;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm">
            <Upload />
            {tc("import")}
          </Button>
          <Button variant="outline" size="sm">
            <Download />
            {tc("export")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/${orgSlug}/members?invite=true`} />}
          >
            <Mail />
            {t("inviteMember")}
          </Button>
          <Button size="sm" render={<Link href={`/${orgSlug}/members?new=true`} />}>
            <Plus />
            {t("newMember")}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="directory">
        <TabsList>
          <TabsTrigger value="directory">{t("tabs.directory")}</TabsTrigger>
          <TabsTrigger value="invitations">
            {pendingInvitationsCount > 0
              ? t("tabs.invitationsWithCount", { count: pendingInvitationsCount })
              : t("tabs.invitations")}
          </TabsTrigger>
          <TabsTrigger value="inviteLink">{t("tabs.inviteLink")}</TabsTrigger>
          <TabsTrigger value="joinRequests">
            {joinRequests.length > 0
              ? t("tabs.joinRequestsWithCount", { count: joinRequests.length })
              : t("tabs.joinRequests")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="space-y-6 pt-4">
          {directoryEmpty ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="mb-6 rounded-full bg-primary/10 p-4">
                  <Users className="size-10 text-primary" />
                </div>
                <h2 className="text-lg font-semibold">{t("empty.title")}</h2>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  {t("empty.description")}
                </p>
                <Button
                  className="mt-6"
                  render={<Link href={`/${orgSlug}/members?new=true`} />}
                >
                  <Plus />
                  {t("empty.cta")}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* KPI cards */}
              <div className="grid gap-4 sm:grid-cols-3">
                {kpiCards.map((kpi) => (
                  <Card key={kpi.key} size="sm">
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{kpi.label}</p>
                      <p className="mt-1 text-2xl font-semibold tabular-nums">
                        {kpi.value}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <MembersToolbar />

              {/* Liste */}
              <Card className="py-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("table.name")}</TableHead>
                      <TableHead>{t("table.phone")}</TableHead>
                      <TableHead>{t("table.role")}</TableHead>
                      <TableHead>{t("table.status")}</TableHead>
                      <TableHead>{t("table.joinedAt")}</TableHead>
                      <TableHead className="w-12 text-right">
                        <span className="sr-only">{tc("actions")}</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.rows.length === 0 ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell
                          colSpan={6}
                          className="h-24 text-center text-muted-foreground"
                        >
                          {t("noResults")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      list.rows.map((row) => {
                        const memberStatus = isMemberStatus(row.status)
                          ? row.status
                          : null;
                        return (
                          <TableRow key={row.id}>
                            <TableCell className="font-medium text-foreground">
                              <span className="block">{row.fullName}</span>
                              {row.email ? (
                                <span className="block text-xs text-muted-foreground">
                                  {row.email}
                                </span>
                              ) : null}
                            </TableCell>
                            <TableCell>{formatPhone(row.phoneNumber)}</TableCell>
                            <TableCell>
                              {roleLabel(row.role, row.customRole)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  memberStatus
                                    ? STATUS_BADGE_VARIANT[memberStatus]
                                    : "outline"
                                }
                              >
                                {memberStatus
                                  ? t(`status.${STATUS_I18N_KEY[memberStatus]}`)
                                  : row.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground tabular-nums">
                              {formatJoined(row.joinedAt)}
                            </TableCell>
                            <TableCell className="text-right">
                              <MemberRowActions
                                orgSlug={orgSlug}
                                member={{
                                  id: row.id,
                                  fullName: row.fullName,
                                  status: row.status,
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </Card>

              <MembersPagination
                page={list.page}
                totalPages={list.totalPages}
                total={list.total}
                pageSize={list.pageSize}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="invitations" className="pt-4">
          <PendingInvitationsTab orgSlug={orgSlug} invitations={invitations} />
        </TabsContent>

        <TabsContent value="inviteLink" className="pt-4">
          <InviteLinkTab
            orgSlug={orgSlug}
            organizationName={organization.name}
            activeLink={activeInviteLink}
          />
        </TabsContent>

        <TabsContent value="joinRequests" className="pt-4">
          <PendingJoinRequestsTab orgSlug={orgSlug} requests={joinRequests} />
        </TabsContent>
      </Tabs>

      <MemberFormDialog orgSlug={orgSlug} />
      {editMember ? (
        <MemberFormDialog orgSlug={orgSlug} member={editMember} />
      ) : null}
      <InviteMemberDialog orgSlug={orgSlug} />
      <GenerateInviteLinkDialog orgSlug={orgSlug} />
    </div>
  );
}
