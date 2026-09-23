"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { DOCUMENT_CATEGORIES, type DocumentCategory } from "@/lib/documents/constants";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Filtre par catégorie (chips), piloté par l'URL (`?category=x`) — même
 * patron que le filtre par jour du calendrier des réunions
 * (`MeetingsCalendar`). Additif : ne remplace jamais le filtrage
 * multi-tenant fait côté serveur dans `listDocuments`.
 */
export function DocumentsCategoryFilter({
  currentCategory,
}: {
  currentCategory?: DocumentCategory;
}) {
  const t = useTranslations("documents");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setCategory(category: DocumentCategory | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (category) {
      params.set("category", category);
    } else {
      params.delete("category");
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        variant={!currentCategory ? "default" : "outline"}
        onClick={() => setCategory(null)}
        className={cn("rounded-full")}
      >
        {t("filters.all")}
      </Button>
      {DOCUMENT_CATEGORIES.map((category) => (
        <Button
          key={category}
          type="button"
          size="sm"
          variant={currentCategory === category ? "default" : "outline"}
          onClick={() => setCategory(category)}
          className="rounded-full"
        >
          {t(`categories.${category}`)}
        </Button>
      ))}
    </div>
  );
}
