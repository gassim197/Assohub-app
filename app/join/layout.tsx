import { getTranslations } from "next-intl/server";

import { Logo } from "@/components/ui/logo";

/**
 * Chrome public des pages `/join/*` (volet 4 de la 4B) — identique à
 * `app/invitations/layout.tsx` (même tagline/légal, contenu générique de
 * marque, pas spécifique au flux d'invitation nominative).
 */
export default async function JoinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("invitations.accept.footer");

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="flex justify-center border-b bg-background px-4 py-5">
        <Logo variant="full" scheme="light" />
      </header>
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-lg">{children}</div>
      </main>
      <footer className="flex flex-col items-center gap-1 border-t bg-background px-4 py-6 text-center text-xs text-muted-foreground">
        <Logo variant="icon" scheme="light" />
        <p>{t("tagline")}</p>
        <p>{t("legal")}</p>
      </footer>
    </div>
  );
}
