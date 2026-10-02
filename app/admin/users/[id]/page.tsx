import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { currentAdmin } from "@/lib/admin";
import { Avatar } from "@/components/ui";
import { AdminActions } from "@/components/admin-actions";
import { locationLabel } from "@/lib/public";
export default async function UserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await currentAdmin())) notFound();
  const { id } = await params;
  const user = await db().user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      username: true,
      role: true,
      suspended: true,
      createdAt: true,
      donor: {
        include: { donations: { orderBy: { date: "desc" }, take: 100 } },
      },
    },
  });
  if (!user) notFound();
  const donor = user.donor;
  const location = donor
    ? await locationLabel([
        donor.divisionId,
        donor.districtId,
        donor.localityId,
        donor.areaId,
      ])
    : "";
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">User details</span>
        <h1>{user.name}</h1>
        <p>
          {user.suspended ? "Suspended" : "Active"} ·{" "}
          {user.role === "ADMIN" ? "Administrator" : "Member"}
        </p>
      </div>
      <section className="dashboard-panel">
        <div className="profile-identity">
          <Avatar name={user.name} url={donor?.imageUrl || null} />
          <div>
            <h2>{user.name}</h2>
            <p>{user.email}</p>
          </div>
          <span className="blood-badge">{donor?.bloodGroup || "—"}</span>
        </div>
        <dl className="profile-details">
          <dt>Username</dt>
          <dd>{user.username || "—"}</dd>
          <dt>Email verified</dt>
          <dd>{user.emailVerified ? "Yes" : "No"}</dd>
          <dt>Contact number</dt>
          <dd>{donor?.phone || "Not set"}</dd>
          <dt>Location</dt>
          <dd>{location || "Not set"}</dd>
          <dt>Listing</dt>
          <dd>
            {donor?.moderationBlocked
              ? "Blocked by admin"
              : donor?.visible
                ? "Visible when profile is complete"
                : "Private"}
          </dd>
          <dt>Consent</dt>
          <dd>{donor?.consentAt ? "Given" : "Not given"}</dd>
          <dt>Availability</dt>
          <dd>{donor?.available ? "Available" : "Unavailable"}</dd>
          <dt>Donations</dt>
          <dd>{donor?.donationCount || 0}</dd>
        </dl>
      </section>
      <section className="dashboard-panel">
        <h2>Manage account</h2>
        <p>
          Suspending an account signs out all sessions and removes its public
          listing. Restoring a listing preserves the donor’s own visibility and
          consent choices.
        </p>
        <AdminActions
          userId={id}
          actions={[
            {
              value: user.suspended ? "unsuspend" : "suspend",
              label: user.suspended ? "Reactivate account" : "Suspend account",
            },
            {
              value: user.role === "ADMIN" ? "demote" : "promote",
              label:
                user.role === "ADMIN"
                  ? "Remove admin role"
                  : "Grant admin role",
            },
            ...(donor
              ? [
                  {
                    value: donor.moderationBlocked ? "restore" : "hide",
                    label: donor.moderationBlocked
                      ? "Allow listing"
                      : "Block listing",
                  },
                ]
              : []),
          ]}
        />
      </section>
      <section className="dashboard-panel">
        <h2>Donation records</h2>
        <p>
          Showing up to 100 recent records. Corrections are recorded in the
          activity log.
        </p>
        {donor?.donations.map((d) => (
          <article className="admin-record" key={d.id}>
            <h3>{d.hospital || "Donation"}</h3>
            <p>{d.date.toISOString().slice(0, 10)}</p>
            <p>{d.note || "No notes"}</p>
            <AdminActions
              userId={id}
              donationId={d.id}
              actions={[
                { value: "delete-donation", label: "Delete this record" },
              ]}
            />
          </article>
        ))}
        {!donor?.donations.length && <p>No donation records.</p>}
      </section>
    </>
  );
}
