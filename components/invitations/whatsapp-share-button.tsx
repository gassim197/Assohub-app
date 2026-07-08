"use client";

import { MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";

// Couleur officielle WhatsApp — seule exception volontaire à la charte
// (§9.1 CLAUDE.md), justifiée par l'identité de marque du canal de partage.
const WHATSAPP_GREEN = "#25D366";

/**
 * CTA principal de la carte de lien d'invitation (volet 3 de la 4B,
 * checkpoint 2). `https://wa.me/?text=...` fonctionne aussi bien sur mobile
 * (ouvre l'app WhatsApp) que sur desktop (ouvre WhatsApp Web) sans détection
 * de plateforme côté client.
 *
 * Le message (nom d'organisation en gras via `*...*`, syntaxe WhatsApp) est
 * entièrement construit par `useTranslations` puis encodé d'un bloc avec
 * `encodeURIComponent` — le formatage `*...*` est constitué de caractères
 * ASCII ordinaires, donc préservé tel quel par l'encodage URL.
 */
export function WhatsappShareButton({
  url,
  organizationName,
}: {
  url: string;
  organizationName: string;
}) {
  const t = useTranslations("invitations.inviteLink");

  const message = t("whatsappMessage", { orgName: organizationName, link: url });
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
      style={{ backgroundColor: WHATSAPP_GREEN }}
    >
      <MessageCircle className="size-4" />
      {t("card.whatsappShare")}
    </a>
  );
}
