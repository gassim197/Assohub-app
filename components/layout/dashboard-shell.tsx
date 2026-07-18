"use client";

import { useState } from "react";

import type { UserOrganizationRow } from "@/lib/organizations/queries";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { Topbar } from "@/components/layout/topbar";

interface DashboardShellProps {
  orgSlug: string;
  userName: string;
  userInitials: string;
  organizations: UserOrganizationRow[];
  children: React.ReactNode;
}

/**
 * Coquille du dashboard (session 8C) : porte l'état d'ouverture de la
 * sidebar mobile, partagé entre `Topbar` (hamburger) et `MobileSidebar`
 * (Sheet) — deux Client Components frères qui ne peuvent pas se coordonner
 * sans un parent commun tenant l'état. `Sidebar` (desktop) reste statique,
 * masquée sous 768px (`hidden md:flex`, cf. `sidebar.tsx`).
 */
export function DashboardShell({
  orgSlug,
  userName,
  userInitials,
  organizations,
  children,
}: DashboardShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        orgSlug={orgSlug}
        userName={userName}
        userInitials={userInitials}
        organizations={organizations}
      />
      <MobileSidebar
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
        orgSlug={orgSlug}
        userName={userName}
        userInitials={userInitials}
        organizations={organizations}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-muted/20 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
