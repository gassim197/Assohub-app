import { getTranslations } from "next-intl/server";

export default async function MembersPage() {
  const t = await getTranslations();
  return (
    <div>
      <h1 className="text-2xl font-semibold">{t("members.title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("dashboard.underConstructionDesc")}</p>
    </div>
  );
}
