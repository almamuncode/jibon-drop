import Link from "next/link";
import { requireDonor } from "@/lib/security";
import { dateLabel } from "@/components/ui";
import { AccountActions, StatusControls } from "@/components/dashboard";
export default async function Dashboard() {
  const d = await requireDonor();
  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">Your donor dashboard</span>
        <h1>Welcome{d.name ? ", " + d.name.split(" ")[0] : ""}.</h1>
        <p>
          Keep your profile current, and your donation memories in one place.
        </p>
      </div>
      {(!d.bloodGroup || !d.phone) && (
        <div className="notice">
          Complete your profile to join the directory.{" "}
          <Link href="/dashboard/profile">Set up my profile →</Link>
        </div>
      )}
      <div className="stats">
        <article>
          <p>Recorded donations</p>
          <strong>{d.donationCount}</strong>
          <small>Self-reported</small>
        </article>
        <article>
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
      <AccountActions />
    </>
  );
}
