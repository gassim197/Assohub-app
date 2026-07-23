import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Conditions générales d'utilisation — AssoHub" };

const SECTION_KEYS = [
  "s1",
  "s2",
  "s3",
  "s4",
  "s5",
  "s6",
  "s7",
  "s8",
  "s9",
  "s10",
  "s11",
  "s12",
  "s13",
] as const;

export default async function ConditionsUtilisationPage() {
  const t = await getTranslations("legal.conditionsUtilisation");

  const sections = SECTION_KEYS.map((key) => ({
    id: key,
    title: t(`sections.${key}.title`),
    body: t(`sections.${key}.body`),
  }));

  return (
    <LegalPage
      title={t("title")}
      lastUpdated={t("lastUpdated")}
      sections={sections}
      showToc
    />
  );
}
