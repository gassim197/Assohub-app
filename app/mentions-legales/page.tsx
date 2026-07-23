import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Mentions légales — AssoHub" };

const SECTION_KEYS = ["s1", "s2", "s3", "s4", "s5", "s6"] as const;

export default async function MentionsLegalesPage() {
  const t = await getTranslations("legal.mentionsLegales");

  const sections = SECTION_KEYS.map((key) => ({
    id: key,
    title: t(`sections.${key}.title`),
    body: t(`sections.${key}.body`),
  }));

  return (
    <LegalPage title={t("title")} lastUpdated={t("lastUpdated")} sections={sections} />
  );
}
