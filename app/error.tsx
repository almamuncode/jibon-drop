"use client";
import { useTranslation } from "@/components/language";

export default function ErrorPage({ reset }: { reset: () => void }) {
  const t = useTranslation();

  return (
    <div className="container narrow">
      <h1>{t("We couldn’t load this page.")}</h1>
      <p>
        {t(
          "Please try again. If this is a new installation, check the database setup.",
        )}{" "}
      </p>
      <button className="button" onClick={reset}>
        {t("Try again")}{" "}
      </button>
    </div>
  );
}
