import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { requireOrgAccess } from "@/lib/auth/org";
import { getMemberById } from "@/lib/members/queries";
import {
  STATUS_BADGE_VARIANT,
  STATUS_I18N_KEY,
  isMemberRole,
  isMemberStatus,
} from "@/lib/members/constants";
import { formatPhone } from "@/lib/phone";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MemberDetailActions } from "@/components/members/member-detail-actions";
import { MemberFormDialog } from "@/components/members/member-form-dialog";

/** Initiales (1 à 2 lettres) pour le fallback d'avatar. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "";
  if (parts.length === 0) return "?";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1] ?? "";
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

/** Ligne libellé / valeur d'une section de la fiche. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-2 sm:grid-cols-[200px_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; memberId: string }>;
}) {
  const { orgSlug, memberId } = await params;
  const { organizationId } = await requireOrgAccess(orgSlug);

  // getMemberById est borné au tenant et exclut les archivés : un membre d'une
  // autre organisation (ou supprimé) renvoie null → 404 propre.
  const member = await getMemberById(organizationId, memberId);
  if (!member) {
    notFound();
  }

  const [t, locale] = await Promise.all([
    getTranslations("members"),
    getLocale(),
  ]);

  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "long" });
  function formatDate(value: string | null): string | null {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : dateFormatter.format(parsed);
  }

  const statusKey = isMemberStatus(member.status)
    ? STATUS_I18N_KEY[member.status]
    : null;
  const statusLabel = statusKey ? t(`status.${statusKey}`) : member.status;
  const statusVariant = isMemberStatus(member.status)
    ? STATUS_BADGE_VARIANT[member.status]
    : "outline";

  const roleLabel =
    member.role === "autre" && member.customRole?.trim()
      ? member.customRole
      : isMemberRole(member.role)
        ? t(`roles.${member.role}`)
        : member.role;

  const notProvided = (
    <span className="text-muted-foreground">{t("detail.notProvided")}</span>
  );
  const leftAtFormatted = formatDate(member.leftAt);

  return (
    <div className="space-y-6">
      {/* Fil d'Ariane / retour */}
      <Button
        variant="ghost"
        size="sm"
        render={<Link href={`/${orgSlug}/members`} />}
      >
        <ArrowLeft />
        {t("detail.backToList")}
      </Button>

      {/* En-tête : identité + actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar size="lg">
            <AvatarFallback>{initials(member.fullName)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {member.fullName}
              </h1>
              <Badge variant={statusVariant}>{statusLabel}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{roleLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            render={
              <Link href={`/${orgSlug}/members/${member.id}?edit=true`} />
            }
          >
            <Pencil />
            {t("detail.edit")}
          </Button>
          <MemberDetailActions
            orgSlug={orgSlug}
            member={{
              id: member.id,
              fullName: member.fullName,
              status: member.status,
            }}
          />
        </div>
      </div>

      {/* Détail en mode lecture */}
      <Card>
        <CardContent className="space-y-6">
          {/* Coordonnées */}
          <section>
            <h2 className="text-sm font-semibold text-foreground">
              {t("detail.sectionContact")}
            </h2>
            <Separator className="mt-2" />
            <dl className="mt-2 divide-y divide-border">
              <Field label={t("detail.phone")}>
                {formatPhone(member.phoneNumber)}
              </Field>
              <Field label={t("detail.email")}>
                {member.email ?? notProvided}
              </Field>
            </dl>
          </section>

          {/* Adhésion */}
          <section>
            <h2 className="text-sm font-semibold text-foreground">
              {t("detail.sectionMembership")}
            </h2>
            <Separator className="mt-2" />
            <dl className="mt-2 divide-y divide-border">
              <Field label={t("detail.role")}>{roleLabel}</Field>
              <Field label={t("detail.status")}>
                <Badge variant={statusVariant}>{statusLabel}</Badge>
              </Field>
              <Field label={t("detail.joinedAt")}>
                {formatDate(member.joinedAt) ?? notProvided}
              </Field>
              {leftAtFormatted ? (
                <Field label={t("detail.leftAt")}>
                  {t("detail.exitLine", {
                    status: statusLabel,
                    date: leftAtFormatted,
                  })}
                </Field>
              ) : null}
            </dl>
          </section>

          {/* Informations personnelles */}
          <section>
            <h2 className="text-sm font-semibold text-foreground">
              {t("detail.sectionPersonal")}
            </h2>
            <Separator className="mt-2" />
            <dl className="mt-2 divide-y divide-border">
              <Field label={t("detail.dateOfBirth")}>
                {formatDate(member.dateOfBirth) ?? notProvided}
              </Field>
              <Field label={t("detail.profession")}>
                {member.profession ?? notProvided}
              </Field>
              <Field label={t("detail.notes")}>
                {member.notes?.trim() ? (
                  <span className="whitespace-pre-wrap">{member.notes}</span>
                ) : (
                  <span className="text-muted-foreground">
                    {t("detail.notesEmpty")}
                  </span>
                )}
              </Field>
            </dl>
          </section>
        </CardContent>
      </Card>

      {/* Modal d'édition, pilotée par ?edit=true */}
      <MemberFormDialog orgSlug={orgSlug} member={member} />
    </div>
  );
}
