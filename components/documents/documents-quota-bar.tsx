import { getLocale, getTranslations } from "next-intl/server";

import { ORGANIZATION_STORAGE_QUOTA_BYTES } from "@/lib/documents/quota";
import { formatSize } from "@/lib/documents/format";
import { Progress } from "@/components/ui/progress";

/**
 * Indicateur de quota (visible par tous, discret mais clair — décision
 * produit). `usedBytes` vient du compteur `organization_storage_usage`
 * (lecture O(1), cf. `lib/documents/quota.ts`), jamais recalculé ici.
 */
export async function DocumentsQuotaBar({ usedBytes }: { usedBytes: number }) {
  const [t, tSize, locale] = await Promise.all([
    getTranslations("documents.quota"),
    getTranslations("documents.size"),
    getLocale(),
  ]);

  const percentUsed = Math.min(100, (usedBytes / ORGANIZATION_STORAGE_QUOTA_BYTES) * 100);
  const isNearLimit = percentUsed >= 90;
  // Même unité adaptative que la colonne Taille : « 45 Ko utilisés sur 200 Mo ».
  const used = formatSize(usedBytes, locale);
  const total = formatSize(ORGANIZATION_STORAGE_QUOTA_BYTES, locale);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {t("label", {
            used: tSize(used.unit, { size: used.value }),
            total: tSize(total.unit, { size: total.value }),
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
