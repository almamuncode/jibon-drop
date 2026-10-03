import { getTranslation } from "@/lib/i18n-server";
import Link from "next/link";
import {
  ArrowRight,
  Search,
  ShieldCheck,
  Droplet,
  UserRound,
  ClipboardList,
} from "lucide-react";
import { SearchForm } from "@/components/search";
import { SocialIcon } from "@/components/social-icon";
export default async function Home() {
  const t = await getTranslation();

  return (
    <div className="home-experience">
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
      <section
        className="home-shortcuts"
        aria-label={t("A simple way to help")}
      >
        <Link href="/find-donors">
          <span>
            <Search size={21} aria-hidden="true" />
          </span>
          <div>
            <strong>{t("Find a donor")}</strong>
            <small>{t("Choose a blood group")}</small>
          </div>
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
        <Link href="/dashboard/profile">
          <span>
            <UserRound size={21} aria-hidden="true" />
          </span>
          <div>
            <strong>{t("My donor profile")}</strong>
            <small>{t("Your details. Your availability. Your choice.")}</small>
          </div>
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
        <Link href="/dashboard/donations">
          <span>
            <ClipboardList size={21} aria-hidden="true" />
          </span>
          <div>
            <strong>{t("Donation records")}</strong>
            <small>{t("Recorded donations")}</small>
          </div>
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
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
      <div className="community-invitation">
        <a
          className="button"
          href="https://www.facebook.com/groups/jibondropapp"
          target="_blank"
          rel="noopener noreferrer"
        >
          <SocialIcon platform="Facebook" />
          {t("Join our Facebook community")}
          <ArrowRight size={18} aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
