"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

interface MembersPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
}

/**
 * Pagination de la liste des membres. La page courante vit dans l'URL (`?page=`)
 * pour rester partageable et survivre au rafraîchissement ; le Server Component
 * re-fetche à chaque navigation.
 */
export function MembersPagination({
  page,
  totalPages,
  total,
  pageSize,
}: MembersPaginationProps) {
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
