import { dateLabel } from "@/lib/format";
import { getLocale, getTranslation } from "@/lib/i18n-server";
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
  const t = await getTranslation();
  const locale = await getLocale();

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
    ? await locationLabel(
        [donor.divisionId, donor.districtId, donor.localityId, donor.areaId],
        locale,
      )
    : "";
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">{t("User details")}</span>
        <h1>{user.name}</h1>
        <p>
          {user.suspended ? t("Suspended") : t("Active")} ·{" "}
          {user.role === "ADMIN" ? t("Administrator") : t("Member")}
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
          <dt>{t("Username")}</dt>
          <dd>{user.username || "—"}</dd>
          <dt>{t("Email verified")}</dt>
          <dd>{user.emailVerified ? t("Yes") : t("No")}</dd>
          <dt>{t("Contact number")}</dt>
          <dd>{donor?.phone || t("Not set")}</dd>
          <dt>{t("Location")}</dt>
          <dd>{location || t("Not set")}</dd>
          <dt>{t("Listing")}</dt>
          <dd>
            {donor?.moderationBlocked
              ? t("Blocked by admin")
              : donor?.visible
                ? t("Visible when profile is complete")
                : t("Private")}
          </dd>
          <dt>{t("Consent")}</dt>
          <dd>{donor?.consentAt ? t("Given") : t("Not given")}</dd>
          <dt>{t("Availability")}</dt>
          <dd>{donor?.available ? t("Available") : t("Unavailable")}</dd>
          <dt>{t("Donations")}</dt>
          <dd>{donor?.donationCount || 0}</dd>
        </dl>
      </section>
      <section className="dashboard-panel">
        <h2>{t("Manage account")}</h2>
        <p>
          {t(
            "Suspending an account signs out all sessions and removes its public listing. Restoring a listing preserves the donor’s own visibility and consent choices.",
          )}{" "}
        </p>
        <AdminActions
          userId={id}
          actions={[
            {
              value: user.suspended ? "unsuspend" : "suspend",
              label: user.suspended
                ? t("Reactivate account")
                : t("Suspend account"),
            },
            {
              value: user.role === "ADMIN" ? "demote" : "promote",
              label:
                user.role === "ADMIN"
                  ? t("Remove admin role")
                  : t("Grant admin role"),
            },
            ...(donor
              ? [
                  {
                    value: donor.moderationBlocked ? "restore" : "hide",
                    label: donor.moderationBlocked
                      ? t("Allow listing")
                      : t("Block listing"),
                  },
                ]
              : []),
          ]}
        />
      </section>
      <section className="dashboard-panel">
        <h2>{t("Donation records")}</h2>
        <p>
          {t(
            "Showing up to 100 recent records. Corrections are recorded in the activity log.",
          )}{" "}
        </p>
        {donor?.donations.map((d) => (
          <article className="admin-record" key={d.id}>
            <h3>{d.hospital || t("Donation")}</h3>
            <p>{dateLabel(d.date, locale)}</p>
            <p>{d.note || t("No notes")}</p>
            <AdminActions
              userId={id}
              donationId={d.id}
              actions={[
                { value: "delete-donation", label: t("Delete this record") },
              ]}
            />
          </article>
        ))}
        {!donor?.donations.length && <p>{t("No donation records.")}</p>}
      </section>
    </>
  );
}
