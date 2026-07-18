"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  DEFAULT_REPORTS_PERIOD,
  REPORTS_PERIOD_OPTIONS,
  isReportsPeriodOption,
  todayISO,
  type ReportsPeriodOption,
} from "@/lib/reports/period";
import {
  EXPENSE_CATEGORIES,
  REVENUE_CATEGORIES,
  TRANSACTION_TYPES,
} from "@/lib/reports/constants";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "all";
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Barre d'outils de l'onglet "Transactions" (checkpoint 3, session 7) :
 * recherche par description (debouncée), filtre type (tous/revenus/dépenses),
 * filtre catégorie (dépend du type sélectionné — groupé par type quand
 * "tous"), filtre période (mêmes options que la vue d'ensemble, cf.
 * `ReportsPeriodFilter`, mais paramètres d'URL non préfixés puisque cet
 * onglet a sa propre portée). État dans l'URL (`?search=`, `?type=`,
 * `?category=`, `?period=`, `?from=`, `?to=`) ; tout changement ramène à la
 * première page.
 */
export function TransactionsToolbar() {
  const t = useTranslations("reports.transactions.toolbar");
  const tTypes = useTranslations("reports.transactions.types");
  const tPeriod = useTranslations("reports.period");
  const tCategoryRevenue = useTranslations("reports.categories.revenue");
  const tCategoryExpense = useTranslations("reports.categories.expense");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const currentType = searchParams.get("type") ?? ALL;
  const currentCategory = searchParams.get("category") ?? ALL;
  const rawPeriod = searchParams.get("period");
  const currentPeriod: ReportsPeriodOption =
    rawPeriod && isReportsPeriodOption(rawPeriod) ? rawPeriod : DEFAULT_REPORTS_PERIOD;

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [from, setFrom] = useState(searchParams.get("from") ?? todayISO());
  const [to, setTo] = useState(searchParams.get("to") ?? todayISO());

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

  function handleTypeChange(value: string) {
    // Le type change l'ensemble des catégories valides : on efface le filtre
    // catégorie plutôt que de laisser une combinaison impossible en place.
    commit({ type: value, category: undefined });
  }

  function handlePeriodChange(value: string) {
    const option = value as ReportsPeriodOption;
    if (option === "custom") {
      commit({ period: option, from, to });
    } else {
      commit({ period: option, from: undefined, to: undefined });
    }
  }

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

        <Select value={currentType} onValueChange={(value) => handleTypeChange(value as string)}>
          <SelectTrigger className="sm:w-40" aria-label={t("typeLabel")}>
            <SelectValue>
              {(value: string | null) =>
                tTypes((value ?? ALL) as (typeof TRANSACTION_TYPES)[number] | "all")
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{tTypes("all")}</SelectItem>
            {TRANSACTION_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {tTypes(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={currentCategory}
          onValueChange={(value) => commit({ category: value as string })}
        >
          <SelectTrigger className="sm:w-52" aria-label={t("categoryLabel")}>
            <SelectValue>
              {(value: string | null) => {
                if (!value || value === ALL) return t("allCategories");
                if ((REVENUE_CATEGORIES as readonly string[]).includes(value)) {
                  return tCategoryRevenue(value as (typeof REVENUE_CATEGORIES)[number]);
                }
                if ((EXPENSE_CATEGORIES as readonly string[]).includes(value)) {
                  return tCategoryExpense(value as (typeof EXPENSE_CATEGORIES)[number]);
                }
                return value;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("allCategories")}</SelectItem>
            {currentType !== "expense" ? (
              <SelectGroup>
                {currentType === ALL ? (
                  <SelectLabel>{tTypes("revenue")}</SelectLabel>
                ) : null}
                {REVENUE_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {tCategoryRevenue(category)}
                  </SelectItem>
                ))}
              </SelectGroup>
            ) : null}
            {currentType !== "revenue" ? (
              <SelectGroup>
                {currentType === ALL ? (
                  <SelectLabel>{tTypes("expense")}</SelectLabel>
                ) : null}
                {EXPENSE_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {tCategoryExpense(category)}
                  </SelectItem>
                ))}
              </SelectGroup>
            ) : null}
          </SelectContent>
        </Select>

        <Select value={currentPeriod} onValueChange={(value) => handlePeriodChange(value as string)}>
          <SelectTrigger className="sm:w-44" aria-label={tPeriod("label")}>
            <SelectValue>
              {(value: string | null) =>
                tPeriod(`options.${(value ?? DEFAULT_REPORTS_PERIOD) as ReportsPeriodOption}`)
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {REPORTS_PERIOD_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {tPeriod(`options.${option}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {currentPeriod === "custom" ? (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={from}
            max={to}
            onChange={(event) => setFrom(event.target.value)}
            onBlur={() => commit({ from, to })}
            aria-label={tPeriod("from")}
            className="w-40"
          />
          <span className="text-sm text-muted-foreground">{tPeriod("rangeSeparator")}</span>
          <Input
            type="date"
            value={to}
            min={from}
            max={todayISO()}
            onChange={(event) => setTo(event.target.value)}
            onBlur={() => commit({ from, to })}
            aria-label={tPeriod("to")}
            className="w-40"
          />
        </div>
      ) : null}
    </div>
  );
}
