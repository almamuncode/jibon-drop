import { getTranslation } from "@/lib/i18n-server";
export default async function Page() {
  const t = await getTranslation();
  return (
    <article className="container narrow prose">
      <h1>{t("About Us")}</h1>
      <h2>{t("Blood donors across Bangladesh")}</h2>
      <p>
        {t(
          "JibonDrop helps people find willing blood donors by blood group and location. Search without an account, or sign in to request contact.",
        )}
      </p>
      <h2>{t("You stay in control")}</h2>
      <p>
        {t(
          "Donors choose their availability, directory visibility and contact-sharing settings. Donation records help you keep track of your contributions.",
        )}
      </p>
      <p>{t("For urgent care, contact your hospital or blood bank.")}</p>
    </article>
  );
}
