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
import {
  MEMBER_STATUSES,
  STATUS_I18N_KEY,
  type MemberStatus,
} from "@/lib/members/constants";

// Sentinelle "tous les statuts" — distincte des valeurs métier stockées en base.
const ALL = "all";
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Barre d'outils de la liste des membres : recherche plein-texte (debouncée) et
 * filtre par statut. L'état vit dans l'URL (`?search=`, `?status=`) ; chaque
 * changement réinitialise la pagination et laisse le Server Component re-fetcher.
 */
export function MembersToolbar() {
  const t = useTranslations("members");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const currentStatus = searchParams.get("status") ?? "actif";
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  function commit(next: { search?: string; status?: string }) {
    const params = new URLSearchParams(searchParams.toString());

    if (next.search !== undefined) {
      const term = next.search.trim();
      if (term) params.set("search", term);
      else params.delete("search");
    }
    if (next.status !== undefined) {
      params.set("status", next.status);
    }
    // Tout changement de critère ramène à la première page.
    params.delete("page");

    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    });
  }

  // Debounce de la saisie ; on ignore le premier rendu pour ne pas re-pousser
  // l'URL identique au montage.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const id = setTimeout(() => commit({ search }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("search")}
          aria-label={t("search")}
          className="pl-8"
        />
      </div>

      <Select
        value={currentStatus}
        onValueChange={(value) => commit({ status: value as string })}
      >
        <SelectTrigger className="sm:w-52" aria-label={t("filterStatus")}>
          <SelectValue>
            {(value: string | null) =>
              !value || value === ALL
                ? t("filterAll")
                : t(`status.${STATUS_I18N_KEY[value as MemberStatus]}`)
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("filterAll")}</SelectItem>
          {MEMBER_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {t(`status.${STATUS_I18N_KEY[status]}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
