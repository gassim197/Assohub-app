import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Toaster } from "@/components/ui/toaster";

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const userName = session.user.name;
  const userInitials = getInitials(userName);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        orgSlug={orgSlug}
        userName={userName}
        userInitials={userInitials}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-muted/20 p-6">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}
