import { getTranslation } from "@/lib/i18n-server";
export default async function Page() {
  const t = await getTranslation();
  return (
    <article className="container narrow prose">
      <h1>{t("User Guide")}</h1>
      <h2>{t("Find a donor")}</h2>
      <p>
        {t(
          "Search by blood group and location, open a donor profile and sign in to request contact. Check Contact requests for updates.",
        )}
      </p>
      <h2>{t("Set up your donor profile")}</h2>
      <p>
        {t(
          "Add your blood group, contact number and location. Choose whether to publish your profile and how to share your contact details.",
        )}
      </p>
      <h2>{t("Manage your availability")}</h2>
      <p>
        {t(
          "Use the dashboard switch to show whether you are willing to donate now. This does not confirm medical eligibility.",
        )}
      </p>
      <h2>{t("Review requests and record donations")}</h2>
      <p>
        {t(
          "Use Contact requests to approve or decline requests and Donation records to add past donations. On mobile, these links are in your account dropdown.",
        )}
      </p>
      <p>{t("For urgent care, contact your hospital or blood bank.")}</p>
    </article>
  );
}
