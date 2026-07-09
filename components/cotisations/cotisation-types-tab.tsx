import Link from "next/link";
import { ListChecks, Plus } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import type { CotisationTypeRow } from "@/lib/cotisations/queries";
import { isCotisationFrequency } from "@/lib/cotisations/constants";
import { formatCurrency } from "@/lib/currency";
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
import { CotisationTypeRowActions } from "./cotisation-type-row-actions";

/**
 * Contenu de l'onglet "Types de cotisations" (checkpoint 1, session 5A).
 * Server Component : la liste est déjà chargée par la page parente
 * (`requireOrgAccess` + `getCotisationTypes`).
 */
export async function CotisationTypesTab({
  orgSlug,
  types,
}: {
  orgSlug: string;
  types: CotisationTypeRow[];
}) {
  const [t, locale] = await Promise.all([
    getTranslations("cotisations"),
    getLocale(),
  ]);

  function frequencyLabel(frequency: string): string {
    return isCotisationFrequency(frequency)
      ? t(`types.frequency.${frequency}`)
      : frequency;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button size="sm" render={<Link href={`/${orgSlug}/cotisations?newType=true`} />}>
          <Plus />
          {t("types.new")}
        </Button>
      </div>

      {types.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-6 rounded-full bg-primary/10 p-4">
              <ListChecks className="size-10 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">{t("types.empty.title")}</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              {t("types.empty.description")}
            </p>
            <Button
              className="mt-6"
              render={<Link href={`/${orgSlug}/cotisations?newType=true`} />}
            >
              <Plus />
              {t("types.empty.cta")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("types.table.name")}</TableHead>
                <TableHead>{t("types.table.defaultAmount")}</TableHead>
                <TableHead>{t("types.table.frequency")}</TableHead>
                <TableHead>{t("types.table.autoGenerate")}</TableHead>
                <TableHead>{t("types.table.status")}</TableHead>
                <TableHead className="w-12 text-right">
                  <span className="sr-only">{t("types.rowActions.label")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.map((type) => (
                <TableRow key={type.id}>
                  <TableCell className="font-medium text-foreground">
                    <span className="block">{type.name}</span>
                    {type.description ? (
                      <span className="block text-xs text-muted-foreground">
                        {type.description}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatCurrency(type.defaultAmount, locale)}
                  </TableCell>
                  <TableCell>{frequencyLabel(type.frequency)}</TableCell>
                  <TableCell>
                    <Badge variant={type.autoGenerate ? "success" : "outline"}>
                      {type.autoGenerate
                        ? t("types.autoGenerateOn")
                        : t("types.autoGenerateOff")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={type.isActive ? "success" : "secondary"}>
                      {type.isActive
                        ? t("types.statusActive")
                        : t("types.statusInactive")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <CotisationTypeRowActions
                      orgSlug={orgSlug}
                      type={{ id: type.id, name: type.name }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
