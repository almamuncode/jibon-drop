import Link from "next/link";
import { Bell, ArrowUpRight } from "lucide-react";
import { requireDonor } from "@/lib/security";
import { db } from "@/lib/db";
import { getLocale, getTranslation } from "@/lib/i18n-server";
import { dateLabel } from "@/lib/format";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const donor = await requireDonor();
  const t = await getTranslation();
  const locale = await getLocale();
  const params = await searchParams;
  const page = Math.min(
    100000,
    Math.max(1, Math.floor(Number(params.page)) || 1),
  );
  const rows = await db().notification.findMany({
    where: { userId: donor.userId! },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * 20,
    take: 21,
    select: {
      id: true,
      createdAt: true,
      readAt: true,
      contactRequestId: true,
      contactRequest: {
        select: { status: true, requester: { select: { name: true } } },
      },
    },
  });
  return (
    <>
      <div className="page-intro">
        <h1>{t("Notifications")}</h1>
        <p>{t("Your latest updates, all in one place.")}</p>
      </div>
      <section
        className="dashboard-panel notification-list"
        aria-label={t("Notifications")}
      >
        {rows.length ? (
          rows.slice(0, 20).map((row) => (
            <Link
              className="notification-item"
              key={row.id}
              href={`/dashboard/requests?request=${encodeURIComponent(row.contactRequestId)}`}
            >
              <Bell size={20} aria-hidden="true" />
              <div>
                <strong>
                  {t("Contact request")}
                  {!row.readAt && row.contactRequest.status === "PENDING" && (
                    <span className="notification-new">{t("New")}</span>
                  )}
                </strong>
                <p>{row.contactRequest.requester.name}</p>
                <small className="muted">
                  {dateLabel(row.createdAt, locale)}
                </small>
              </div>
              <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
          ))
        ) : (
          <div className="donation-empty">
            <Bell size={28} aria-hidden="true" />
            <h2>{t("No notifications yet")}</h2>
            <p>{t("New contact requests will appear here.")}</p>
          </div>
        )}
      </section>
      <div className="actions">
        {page > 1 && (
          <Link
            className="button secondary"
            href={`/dashboard/notifications?page=${page - 1}`}
          >
            {t("Previous")}
          </Link>
        )}
        {rows.length > 20 && (
          <Link
            className="button secondary"
            href={`/dashboard/notifications?page=${page + 1}`}
          >
            {t("Next")}
          </Link>
        )}
      </div>
    </>
  );
}
