import Link from "next/link";
import { getTranslations } from "next-intl/server";

import type { DocumentWithUploaderRow } from "@/lib/documents/queries";
import {
  DOCUMENT_CATEGORY_BADGE_VARIANT,
  isDocumentCategory,
} from "@/lib/documents/constants";
import { formatSize } from "@/lib/documents/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DocumentThumbnail } from "./document-thumbnail";
import { DocumentRowActions } from "./document-row-actions";

/**
 * Liste des documents (Server Component, données déjà chargées par la page
 * parente). Même patron que `PaymentHistoryTable` : gère elle-même son état
 * vide, pour rester un composant autonome réutilisable tel quel.
 */
export async function DocumentsTable({
  orgSlug,
  documents,
  canManage,
  locale,
}: {
  orgSlug: string;
  documents: DocumentWithUploaderRow[];
  canManage: boolean;
  locale: string;
}) {
  const [t, tCategories, tSize] = await Promise.all([
    getTranslations("documents"),
    getTranslations("documents.categories"),
    getTranslations("documents.size"),
  ]);

  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const formatDocumentSize = (bytes: number) => {
    const size = formatSize(bytes, locale);
    return tSize(size.unit, { size: size.value });
  };

  if (documents.length === 0) {
    return (
      <Card className="px-6 py-16 text-center">
        <p className="text-sm font-medium text-foreground">{t("empty.title")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("empty.description")}</p>
        {canManage ? (
          <Button
            size="sm"
            className="mt-4"
            render={<Link href={`/${orgSlug}/documents?upload=true`} />}
          >
            {t("empty.cta")}
          </Button>
        ) : null}
      </Card>
    );
  }

  return (
    <Card className="py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-full">{t("table.name")}</TableHead>
            <TableHead>{t("table.category")}</TableHead>
            <TableHead>{t("table.size")}</TableHead>
            <TableHead>{t("table.date")}</TableHead>
            <TableHead>{t("table.uploadedBy")}</TableHead>
            <TableHead className="w-24 text-right">
              <span className="sr-only">{t("rowActions.label")}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((document) => (
            <TableRow key={document.id}>
              {/*
                Colonne Nom : prend tout l'espace laissé par les autres colonnes
                (w-full sur l'en-tête). `max-w-0` empêche la longueur du nom de
                dicter la largeur du tableau — la troncature n'intervient que si
                l'espace restant manque ; `min-w-48` garde une largeur lisible
                sur mobile, où le tableau défile horizontalement.
              */}
              <TableCell className="w-full max-w-0 min-w-48">
                <div className="flex items-center gap-3">
                  <DocumentThumbnail
                    orgSlug={orgSlug}
                    documentId={document.id}
                    mimeType={document.mimeType}
                    displayName={document.displayName}
                  />
                  <div className="min-w-0">
                    <span
                      className="block truncate font-medium text-foreground"
                      title={document.displayName}
                    >
                      {document.displayName}
                    </span>
                    {document.paymentId && document.linkedPaymentCotisationId ? (
                      <Link
                        href={`/${orgSlug}/cotisations/${document.linkedPaymentCotisationId}`}
                        className="text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
                      >
                        {t("linkedTo.payment", {
                          date: document.linkedPaymentPaidAt
                            ? dateFormatter.format(new Date(document.linkedPaymentPaidAt))
                            : "",
                        })}
                      </Link>
                    ) : null}
                    {document.meetingId && document.linkedMeetingScheduledAt ? (
                      <Link
                        href={`/${orgSlug}/meetings/${document.meetingId}`}
                        className="text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
                      >
                        {t("linkedTo.meeting", {
                          date: dateFormatter.format(document.linkedMeetingScheduledAt),
                        })}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    isDocumentCategory(document.category)
                      ? DOCUMENT_CATEGORY_BADGE_VARIANT[document.category]
                      : "outline"
                  }
                >
                  {isDocumentCategory(document.category)
                    ? tCategories(document.category)
                    : document.category}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {formatDocumentSize(document.sizeBytes)}
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {dateFormatter.format(document.createdAt)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {document.uploadedByName}
              </TableCell>
              <TableCell className="text-right">
                <DocumentRowActions
                  orgSlug={orgSlug}
                  document={document}
                  canManage={canManage}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
