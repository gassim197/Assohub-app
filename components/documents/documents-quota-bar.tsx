import { getLocale, getTranslations } from "next-intl/server";

import { ORGANIZATION_STORAGE_QUOTA_BYTES } from "@/lib/documents/quota";
import { formatSizeMbValue } from "@/lib/documents/format";
import { Progress } from "@/components/ui/progress";

/**
 * Indicateur de quota (visible par tous, discret mais clair — décision
 * produit). `usedBytes` vient du compteur `organization_storage_usage`
 * (lecture O(1), cf. `lib/documents/quota.ts`), jamais recalculé ici.
 */
export async function DocumentsQuotaBar({ usedBytes }: { usedBytes: number }) {
  const [t, locale] = await Promise.all([
    getTranslations("documents.quota"),
    getLocale(),
  ]);

  const percentUsed = Math.min(100, (usedBytes / ORGANIZATION_STORAGE_QUOTA_BYTES) * 100);
  const isNearLimit = percentUsed >= 90;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {t("label", {
            used: formatSizeMbValue(usedBytes, locale),
            total: formatSizeMbValue(ORGANIZATION_STORAGE_QUOTA_BYTES, locale),
          })}
        </span>
        {isNearLimit ? (
          <span className="font-medium text-warning">{t("nearLimit")}</span>
        ) : null}
      </div>
      <Progress value={percentUsed} className="max-w-sm" />
    </div>
  );
}
