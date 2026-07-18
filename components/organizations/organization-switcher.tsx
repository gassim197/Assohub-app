"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import type { UserOrganizationRow } from "@/lib/organizations/queries";
import { switchActiveOrganization } from "@/lib/organizations/actions";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/components/ui/toaster";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getOrgInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

/**
 * Switcher d'organisations (session 8B), sous le logo dans `Sidebar`.
 * L'organisation "active" affichée/cochée est déterminée par `orgSlug`
 * (l'URL courante), PAS par `session.activeOrganizationId` — c'est
 * l'organisation que l'utilisateur regarde réellement, l'indicateur le plus
 * honnête (voir la décision "URL ≠ org active" du plan de session).
 * `organizations` est déjà scopée à l'utilisateur courant par
 * `getUserOrganizations` : structurellement impossible d'afficher une
 * organisation dont il n'est pas membre.
 */
export function OrganizationSwitcher({
  orgSlug,
  organizations,
}: {
  orgSlug: string;
  organizations: UserOrganizationRow[];
}) {
  const t = useTranslations("organizations.switcher");
  const [isPending, startTransition] = useTransition();

  const current = organizations.find((org) => org.slug === orgSlug) ?? organizations[0];

  function handleSwitch(org: UserOrganizationRow) {
    if (org.slug === orgSlug) return;
    startTransition(async () => {
      const result = await switchActiveOrganization(org.id);
      if (result && !result.ok) {
        toast.error(t(`errors.${result.error}`));
      }
    });
  }

  return (
    <div className="border-b border-sidebar-border p-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={isPending}
          className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm text-sidebar-foreground transition-colors outline-none hover:bg-sidebar-accent/60 focus-visible:ring-2 focus-visible:ring-sidebar-ring disabled:opacity-60"
        >
          <Avatar size="sm">
            <AvatarFallback className="bg-sidebar-accent text-xs text-sidebar-accent-foreground">
              {current ? getOrgInitial(current.name) : "?"}
            </AvatarFallback>
          </Avatar>
          <span className="flex-1 truncate text-left font-medium">
            {current?.name ?? t("noOrganization")}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-sidebar-foreground/60" />
        </DropdownMenuTrigger>

        <DropdownMenuContent side="bottom" align="start" className="w-56">
          {organizations.map((org) => {
            const isCurrent = org.slug === orgSlug;
            return (
              <DropdownMenuItem
                key={org.id}
                onClick={() => handleSwitch(org)}
                className={cn(isCurrent && "bg-accent/60")}
              >
                <span className="flex-1 truncate">{org.name}</span>
                {isCurrent ? <Check className="size-4 shrink-0" /> : null}
              </DropdownMenuItem>
            );
          })}

          <DropdownMenuSeparator />

          <DropdownMenuItem render={<Link href="/onboarding" />}>
            <Plus className="size-4" />
            {t("createOrganization")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
