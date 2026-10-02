import { dateLabel } from "@/lib/format";
import { getLocale, getTranslation } from "@/lib/i18n-server";
import Link from "next/link";
import { requireDonor } from "@/lib/security";
import { Avatar } from "@/components/ui";
import { StatusControls } from "@/components/dashboard";
import { db } from "@/lib/db";
import { locationLabel } from "@/lib/public";
import { ArrowUpRight, Droplet, Heart, CalendarDays } from "lucide-react";
export default async function Dashboard() {
  const t = await getTranslation();
  const locale = await getLocale();

  const d = await requireDonor();
  const [location, records] = await Promise.all([
    locationLabel([d.divisionId, d.districtId, d.localityId, d.areaId], locale),
    db().donation.findMany({
      where: { donorId: d.id },
      orderBy: { date: "desc" },
      take: 3,
      select: { id: true, date: true, hospital: true },
    }),
  ]);
  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">{t("Your donor dashboard")}</span>
        <h1>
          {t("Welcome")}
          {d.name ? ", " + d.name.split(" ")[0] : ""}.
        </h1>
        <p>
          {t(
            "Keep your profile current, and your donation memories in one place.",
          )}{" "}
        </p>
      </div>
      <section className="donor-welcome">
        <div className="profile-identity">
          <Avatar name={d.name} url={d.imageUrl} />
          <div>
            <span className="welcome-label">{t("Your donor profile")}</span>
            <h2>{d.name || t("Your name")}</h2>
            <p>
              {location ||
                t("Add your location to help nearby donors find you")}
            </p>
          </div>
        </div>
        <div className="welcome-blood">
          <Droplet size={22} aria-hidden="true" />
          <strong>{d.bloodGroup || "—"}</strong>
          <span>{t("Blood group")}</span>
        </div>
        <Link className="welcome-edit" href="/dashboard/profile">
          {t("My profile")} <ArrowUpRight size={18} />
        </Link>
      </section>
      {(!d.bloodGroup || !d.phone) && (
        <div className="notice">
          {t("Complete your profile to join the directory.")}{" "}
          <Link href="/dashboard/profile">{t("Set up my profile →")}</Link>
        </div>
      )}
      <div className="stats">
        <article>
          <Heart size={22} className="red" aria-hidden="true" />
          <p>{t("Recorded donations")}</p>
          <strong>{d.donationCount}</strong>
          <small>{t("Self-reported")}</small>
        </article>
        <article>
          <CalendarDays size={22} className="red" aria-hidden="true" />
          <p>{t("Last recorded donation")}</p>
          <strong className="date-stat">
            {dateLabel(d.lastDonation, locale)}
          </strong>
        </article>
        <article>
          <p>{t("Directory status")}</p>
          <strong className="date-stat">
            {d.visible && d.consentAt ? t("Listed") : t("Hidden")}
          </strong>
          <Link href="/dashboard/profile">{t("Manage visibility →")}</Link>
        </article>
      </div>
      <section className="dashboard-panel recent-donations">
        <div className="results-heading">
          <h2>{t("Recent donations")}</h2>
          <Link className="text-link" href="/dashboard/donations">
            {t("View all")} <ArrowUpRight size={17} />
          </Link>
        </div>
        {records.length ? (
          records.map((record) => (
            <div className="donation-preview" key={record.id}>
              <span className="step-icon">
                <Droplet size={20} />
              </span>
              <div>
                <strong>{record.hospital || t("Blood donation")}</strong>
                <p>{dateLabel(record.date, locale)}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="donation-empty">
            <Heart size={30} aria-hidden="true" />
            <h3>{t("Your donation story starts here")}</h3>
            <p>
              {t(
                "Add a past donation to keep a personal record of your contribution.",
              )}{" "}
            </p>
            <Link className="button secondary" href="/dashboard/donations">
              {t("Add your first record")}{" "}
            </Link>
          </div>
        )}
      </section>
      <div className="dashboard-panel">
        <h2>
          {d.available ? t("Available to help") : t("Temporarily unavailable")}
        </h2>
        <p>
          {t(
            "Availability is your willingness to donate, not medical clearance.",
          )}{" "}
        </p>
        <StatusControls available={d.available} visible={d.visible} />
        <div className="actions">
          <Link className="button" href="/dashboard/donations">
            {t("Add a donation")}{" "}
          </Link>
          <Link className="button secondary" href="/dashboard/profile">
            {t("Manage profile & availability")}{" "}
          </Link>
        </div>
      </div>
      <p className="muted">
        {t(
          "Eligibility must be confirmed by the relevant blood bank or healthcare professional.",
        )}{" "}
      </p>
    </>
  );
}
