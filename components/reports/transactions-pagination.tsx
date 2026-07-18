"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

interface TransactionsPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
}

/**
 * Pagination de l'onglet "Transactions" (checkpoint 3), même patron que
 * `MembersPagination`/`CotisationsPagination` : la page courante vit dans
 * l'URL (`?page=`), traductions partagées (`members.pagination`).
 */
export function TransactionsPagination({
  page,
  totalPages,
  total,
  pageSize,
}: TransactionsPaginationProps) {
  const t = useTranslations("members.pagination");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function goTo(target: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (target <= 1) params.delete("page");
    else params.set("page", String(target));

    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    });
  }

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm text-muted-foreground">
        {t("summary", { from, to, total })}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => goTo(page - 1)}
          disabled={page <= 1 || isPending}
        >
          <ChevronLeft />
          {t("previous")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => goTo(page + 1)}
          disabled={page >= totalPages || isPending}
        >
          {t("next")}
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
