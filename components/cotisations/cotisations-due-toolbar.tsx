"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CotisationTypeRow } from "@/lib/cotisations/queries";

const ALL = "all";
const SEARCH_DEBOUNCE_MS = 300;

const STATUS_OPTIONS = ["all", "en_attente", "en_retard"] as const;
const PERIOD_OPTIONS = ["all", "current", "last", "custom"] as const;

/**
 * Barre d'outils de l'onglet "Cotisations dues" (checkpoint 3, session 5A) :
 * recherche par nom de membre (debouncée), statut, période, type. État dans
 * l'URL (`?search=`, `?status=`, `?period=`, `?periodFrom=`, `?periodTo=`,
 * `?typeId=`) ; tout changement de filtre ramène à la première page.
 */
export function CotisationsDueToolbar({ types }: { types: CotisationTypeRow[] }) {
  const t = useTranslations("cotisations.due");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const currentStatus = searchParams.get("status") ?? ALL;
  const currentPeriod = searchParams.get("period") ?? ALL;
  const currentTypeId = searchParams.get("typeId") ?? ALL;
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [periodFrom, setPeriodFrom] = useState(searchParams.get("periodFrom") ?? "");
  const [periodTo, setPeriodTo] = useState(searchParams.get("periodTo") ?? "");

  function commit(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(next)) {
      if (value === undefined || value === "" || value === ALL) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    params.delete("page");

    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    });
  }

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const id = setTimeout(() => commit({ search: search.trim() }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className="pl-8"
          />
        </div>

        <Select
          value={currentStatus}
          onValueChange={(value) => commit({ status: value as string })}
        >
          <SelectTrigger className="sm:w-44" aria-label={t("filters.statusLabel")}>
            <SelectValue>
              {(value: string | null) =>
                t(`filters.status.${(value ?? ALL) as (typeof STATUS_OPTIONS)[number]}`)
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((status) => (
              <SelectItem key={status} value={status}>
                {t(`filters.status.${status}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={currentPeriod}
          onValueChange={(value) => commit({ period: value as string })}
        >
          <SelectTrigger className="sm:w-44" aria-label={t("filters.periodLabel")}>
            <SelectValue>
              {(value: string | null) =>
                t(`filters.period.${(value ?? ALL) as (typeof PERIOD_OPTIONS)[number]}`)
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((period) => (
              <SelectItem key={period} value={period}>
                {t(`filters.period.${period}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={currentTypeId}
          onValueChange={(value) => commit({ typeId: value as string })}
        >
          <SelectTrigger className="sm:w-48" aria-label={t("filters.type")}>
            <SelectValue>
              {(value: string | null) =>
                !value || value === ALL
                  ? t("filters.allTypes")
                  : (types.find((ty) => ty.id === value)?.name ?? t("filters.allTypes"))
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("filters.allTypes")}</SelectItem>
            {types.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {currentPeriod === "custom" ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            type="date"
            value={periodFrom}
            onChange={(event) => setPeriodFrom(event.target.value)}
            onBlur={() => commit({ periodFrom, periodTo })}
            aria-label={t("filters.periodFrom")}
            className="sm:w-44"
          />
          <span className="text-sm text-muted-foreground">{t("filters.periodRangeSeparator")}</span>
          <Input
            type="date"
            value={periodTo}
            onChange={(event) => setPeriodTo(event.target.value)}
            onBlur={() => commit({ periodFrom, periodTo })}
            aria-label={t("filters.periodTo")}
            className="sm:w-44"
          />
        </div>
      ) : null}
    </div>
  );
}
