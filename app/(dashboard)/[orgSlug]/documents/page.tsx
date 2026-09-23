import Link from "next/link";
import { Plus } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { requireOrgAccess } from "@/lib/auth/org";
import { canManageDocuments } from "@/lib/documents/permissions";
import { isDocumentCategory } from "@/lib/documents/constants";
import { listDocuments } from "@/lib/documents/queries";
import { getOrganizationStorageUsage } from "@/lib/documents/quota";
import { Button } from "@/components/ui/button";
import { DocumentsQuotaBar } from "@/components/documents/documents-quota-bar";
import { DocumentsCategoryFilter } from "@/components/documents/documents-category-filter";
import { DocumentsTable } from "@/components/documents/documents-table";
import { UploadDocumentDialog } from "@/components/documents/upload-document-dialog";

type SearchParams = Record<string, string | string[] | undefined>;

function readParam(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export default async function DocumentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const { organizationId, userId } = await requireOrgAccess(orgSlug);

  const rawCategory = readParam(sp.category);
  const category = rawCategory && isDocumentCategory(rawCategory) ? rawCategory : undefined;

  const [t, locale, canManage, documents, usedBytes] = await Promise.all([
    getTranslations("documents"),
    getLocale(),
    canManageDocuments(organizationId, userId),
    listDocuments(organizationId, category),
    getOrganizationStorageUsage(organizationId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        {canManage ? (
          <Button
            size="sm"
            render={<Link href={`/${orgSlug}/documents?upload=true`} />}
          >
            <Plus />
            {t("addButton")}
          </Button>
        ) : null}
      </div>

      <DocumentsQuotaBar usedBytes={usedBytes} />

      <DocumentsCategoryFilter currentCategory={category} />

      <DocumentsTable
        orgSlug={orgSlug}
        documents={documents}
        canManage={canManage}
        locale={locale}
      />

      {canManage ? <UploadDocumentDialog orgSlug={orgSlug} /> : null}
    </div>
  );
}
