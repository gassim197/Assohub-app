"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import {
  DEFAULT_REPORTS_PERIOD,
  REPORTS_PERIOD_OPTIONS,
  isReportsPeriodOption,
  todayISO,
  type ReportsPeriodOption,
} from "@/lib/reports/period";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Filtre de période de la Vue d'ensemble (checkpoint 2) : 30 jours / cette
 * année / personnalisé, dans l'URL (`overviewPeriod`, `overviewFrom`,
 * `overviewTo`) — préfixé "overview" pour ne pas entrer en collision avec le
 * filtre de période indépendant de l'onglet Transactions (checkpoint 3, même
 * page mais portée différente). Même patron que `CotisationsDueToolbar`.
 */
export function ReportsPeriodFilter() {
  const t = useTranslations("reports.period");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawOption = searchParams.get("overviewPeriod");
  const currentOption: ReportsPeriodOption =
    rawOption && isReportsPeriodOption(rawOption) ? rawOption : DEFAULT_REPORTS_PERIOD;

  const [from, setFrom] = useState(searchParams.get("overviewFrom") ?? todayISO());
  const [to, setTo] = useState(searchParams.get("overviewTo") ?? todayISO());

  function commit(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function handleOptionChange(value: string) {
    const option = value as ReportsPeriodOption;
    if (option === "custom") {
      commit({ overviewPeriod: option, overviewFrom: from, overviewTo: to });
    } else {
      commit({ overviewPeriod: option, overviewFrom: undefined, overviewTo: undefined });
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Select value={currentOption} onValueChange={(value) => handleOptionChange(value as string)}>
        <SelectTrigger className="sm:w-48" aria-label={t("label")}>
          <SelectValue>
            {(value: string | null) =>
              t(`options.${(value ?? DEFAULT_REPORTS_PERIOD) as ReportsPeriodOption}`)
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {REPORTS_PERIOD_OPTIONS.map((option) => (
            <SelectItem key={option} value={option}>
              {t(`options.${option}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {currentOption === "custom" ? (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={from}
            max={to}
            onChange={(event) => setFrom(event.target.value)}
            onBlur={() => commit({ overviewFrom: from, overviewTo: to })}
            aria-label={t("from")}
            className="w-40"
          />
          <span className="text-sm text-muted-foreground">{t("rangeSeparator")}</span>
          <Input
            type="date"
            value={to}
            min={from}
            max={todayISO()}
            onChange={(event) => setTo(event.target.value)}
            onBlur={() => commit({ overviewFrom: from, overviewTo: to })}
            aria-label={t("to")}
            className="w-40"
          />
        </div>
      ) : null}
    </div>
  );
}
