import { getTranslation } from "@/lib/i18n-server";
export default async function Loading() {
  const t = await getTranslation();

  return (
    <div className="container" aria-label={t("Loading")} role="status">
      <div className="skeleton" />
      <div className="skeleton" />
      <div className="skeleton" />
    </div>
  );
}
