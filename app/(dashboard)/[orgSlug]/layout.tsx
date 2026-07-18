import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { getUserOrganizations } from "@/lib/organizations/queries";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { WelcomeToast } from "@/components/layout/welcome-toast";
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
  const organizations = await getUserOrganizations(session.user.id);

  return (
    <>
      <DashboardShell
        orgSlug={orgSlug}
        userName={userName}
        userInitials={userInitials}
        organizations={organizations}
      >
        {children}
      </DashboardShell>
      <Toaster />
      <WelcomeToast />
    </>
  );
}
