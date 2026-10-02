import { getTranslation } from "@/lib/i18n-server";
import Link from "next/link";
import {
  ArrowRight,
  Search,
  Phone,
  HeartHandshake,
  ShieldCheck,
  Droplet,
} from "lucide-react";
import { SearchForm } from "@/components/search";
export default async function Home() {
  const t = await getTranslation();

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-symbol" aria-hidden="true">
            <Droplet size={34} strokeWidth={1.5} />
          </div>
          <div className="eyebrow">
            <span />
            {t("Blood donors across Bangladesh")}{" "}
          </div>
          <h1>
            {t("A little of you.")} <br />
            <span>{t("A lifeline for someone.")}</span>
          </h1>
          <p className="lead">
            {t(
              "Connect with blood donors near you. Search by blood group and location, then reach out when you need support.",
            )}{" "}
          </p>
          <Link className="hero-cta" href="/register">
            {t("Become a donor")} <ArrowRight size={18} />
          </Link>
          <div className="trust">
            <ShieldCheck size={19} />
            <span>{t("Free to search. No account needed.")}</span>
          </div>
        </div>
        <SearchForm compact />
      </section>
      <section className="how">
        <div className="section-title">
          <span className="eyebrow">{t("A simple way to help")}</span>
          <h2>{t("Find support in three simple steps.")}</h2>
          <p>{t("Find the right blood group and reach out directly.")}</p>
        </div>
        <div className="steps">
          {[
            {
              icon: Search,
              title: t("Find a match"),
              text: t(
                "Choose a blood group and narrow your search by location.",
              ),
            },
            {
              icon: Phone,
              title: t("Connect with a donor"),
              text: t(
                "View their profile and send a contact request. Their number is shared only after approval.",
              ),
            },
            {
              icon: HeartHandshake,
              title: t("Coordinate with care"),
              text: t(
                "Confirm availability and arrange donation with your blood bank.",
              ),
            },
          ].map((s, i) => (
            <article key={s.title}>
              <div className="step-icon">
                <s.icon size={25} />
              </div>
              <span className="step-number">0{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="join">
        <div>
          <span className="eyebrow">{t("Your willingness matters")}</span>
          <h2>{t("Someone nearby may need your help.")}</h2>
          <p>
            {t(
              "Create a donor profile. Choose when you’re available and stay in control of your listing.",
            )}{" "}
          </p>
        </div>
        <Link className="button" href="/register">
          {t("Become a donor")} <ArrowRight size={18} />
        </Link>
      </section>
    </>
  );
}
