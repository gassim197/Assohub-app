"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Calendar,
  BarChart2,
  Settings,
  LogOut,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { signOut } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Logo } from "@/components/ui/logo";

const NAV_ITEMS = [
  { key: "home", icon: LayoutDashboard, path: "" },
  { key: "members", icon: Users, path: "/members" },
  { key: "cotisations", icon: CreditCard, path: "/cotisations" },
  { key: "meetings", icon: Calendar, path: "/meetings" },
  { key: "reports", icon: BarChart2, path: "/reports" },
] as const;

interface SidebarProps {
  orgSlug: string;
  userName: string;
  userInitials: string;
}

export function Sidebar({ orgSlug, userName, userInitials }: SidebarProps) {
  const t = useTranslations("dashboard");
  const tAuth = useTranslations("auth");
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <aside className="flex h-screen w-56 flex-col bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex h-14 items-center px-4 border-b border-sidebar-border">
        <Link href={`/${orgSlug}`} className="outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring rounded-sm">
          <Logo variant="full" scheme="dark" />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map(({ key, icon: Icon, path }) => {
          const href = `/${orgSlug}${path}`;
          const isActive =
            path === ""
              ? pathname === `/${orgSlug}`
              : pathname.startsWith(`/${orgSlug}${path}`);

          return (
            <Link
              key={key}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-sidebar-primary pl-[10px]"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {t(key as "home" | "members" | "cotisations" | "meetings" | "reports")}
            </Link>
          );
        })}
      </nav>

      {/* User menu */}
      <div className="border-t border-sidebar-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">
            <Avatar size="sm">
              <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <span className="flex-1 truncate text-left">{userName}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" className="w-48">
            <DropdownMenuItem render={<Link href={`/${orgSlug}/settings`} />}>
              <Settings className="size-4" />
              {t("settings")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={handleSignOut}
            >
              <LogOut className="size-4" />
              {tAuth("signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
