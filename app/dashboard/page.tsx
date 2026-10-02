import Link from "next/link";
import { requireDonor } from "@/lib/security";
import { dateLabel, Avatar } from "@/components/ui";
import { StatusControls } from "@/components/dashboard";
import { db } from "@/lib/db";
import { locationLabel } from "@/lib/public";
import { ArrowUpRight, Droplet, Heart, CalendarDays } from "lucide-react";
export default async function Dashboard() {
  const d = await requireDonor();
  const [location, records] = await Promise.all([
    locationLabel([d.divisionId, d.districtId, d.localityId, d.areaId]),
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
        <span className="eyebrow">Your donor dashboard</span>
        <h1>Welcome{d.name ? ", " + d.name.split(" ")[0] : ""}.</h1>
        <p>
          Keep your profile current, and your donation memories in one place.
        </p>
      </div>
      <section className="donor-welcome">
        <div className="profile-identity">
          <Avatar name={d.name} url={d.imageUrl} />
          <div>
            <span className="welcome-label">Your donor profile</span>
            <h2>{d.name || "Your name"}</h2>
            <p>
              {location || "Add your location to help nearby donors find you"}
            </p>
          </div>
        </div>
        <div className="welcome-blood">
          <Droplet size={22} aria-hidden="true" />
          <strong>{d.bloodGroup || "—"}</strong>
          <span>Blood group</span>
        </div>
        <Link className="welcome-edit" href="/dashboard/profile">
          My profile <ArrowUpRight size={18} />
        </Link>
      </section>
      {(!d.bloodGroup || !d.phone) && (
        <div className="notice">
          Complete your profile to join the directory.{" "}
          <Link href="/dashboard/profile">Set up my profile →</Link>
        </div>
      )}
      <div className="stats">
        <article>
          <Heart size={22} className="red" aria-hidden="true" />
          <p>Recorded donations</p>
          <strong>{d.donationCount}</strong>
          <small>Self-reported</small>
        </article>
        <article>
          <CalendarDays size={22} className="red" aria-hidden="true" />
          <p>Last recorded donation</p>
          <strong className="date-stat">{dateLabel(d.lastDonation)}</strong>
        </article>
        <article>
          <p>Directory status</p>
          <strong className="date-stat">
            {d.visible && d.consentAt ? "Listed" : "Hidden"}
          </strong>
          <Link href="/dashboard/profile">Manage visibility →</Link>
        </article>
      </div>
      <section className="dashboard-panel recent-donations">
        <div className="results-heading">
          <h2>Recent donations</h2>
          <Link className="text-link" href="/dashboard/donations">
            View all <ArrowUpRight size={17} />
          </Link>
        </div>
        {records.length ? (
          records.map((record) => (
            <div className="donation-preview" key={record.id}>
              <span className="step-icon">
                <Droplet size={20} />
              </span>
              <div>
                <strong>{record.hospital || "Blood donation"}</strong>
                <p>{dateLabel(record.date)}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="donation-empty">
            <Heart size={30} aria-hidden="true" />
            <h3>Your donation story starts here</h3>
            <p>
              Add a past donation to keep a personal record of your
              contribution.
            </p>
            <Link className="button secondary" href="/dashboard/donations">
              Add your first record
            </Link>
          </div>
        )}
      </section>
      <div className="dashboard-panel">
        <h2>{d.available ? "Available to help" : "Temporarily unavailable"}</h2>
        <p>
          Availability is your willingness to donate, not medical clearance.
        </p>
        <StatusControls available={d.available} visible={d.visible} />
        <div className="actions">
          <Link className="button" href="/dashboard/donations">
            Add a donation
          </Link>
          <Link className="button secondary" href="/dashboard/profile">
            Manage profile & availability
          </Link>
        </div>
      </div>
      <p className="muted">
        Eligibility must be confirmed by the relevant blood bank or healthcare
        professional.
      </p>
    </>
  );
}
