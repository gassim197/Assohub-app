import Link from "next/link";
import { getTranslations } from "next-intl/server";

import type { DocumentWithUploaderRow } from "@/lib/documents/queries";
import {
  DOCUMENT_CATEGORY_BADGE_VARIANT,
  isDocumentCategory,
} from "@/lib/documents/constants";
import { formatSizeMbValue } from "@/lib/documents/format";
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
  const [t, tCategories] = await Promise.all([
    getTranslations("documents"),
    getTranslations("documents.categories"),
  ]);

  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

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
            <TableHead>{t("table.name")}</TableHead>
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
              <TableCell>
                <div className="flex items-center gap-3">
                  <DocumentThumbnail
                    orgSlug={orgSlug}
                    documentId={document.id}
                    mimeType={document.mimeType}
                    displayName={document.displayName}
                  />
                  <span className="max-w-56 truncate font-medium text-foreground">
                    {document.displayName}
                  </span>
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
                {t("sizeInMb", { size: formatSizeMbValue(document.sizeBytes, locale) })}
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
