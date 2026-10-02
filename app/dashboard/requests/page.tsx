import Link from "next/link";
import { requireDonor } from "@/lib/security";
import { getLocale, getTranslation } from "@/lib/i18n-server";
import { db } from "@/lib/db";
import { contactStatus } from "@/lib/contact-policy";
import { dateLabel } from "@/lib/format";
import { ContactDecision } from "@/components/contact-requests";
import { NotificationStatus } from "@/components/notifications";
import {
  markRequestRead,
  unreadCount,
  unreadRequestIds,
} from "@/lib/notifications";
import { ReportAbuse } from "@/components/report-abuse";
export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{
    receivedPage?: string;
    sentPage?: string;
    request?: string;
  }>;
}) {
  const params = await searchParams;
  const pageNumber = (value?: string) =>
    Math.min(100000, Math.max(1, Math.floor(Number(value)) || 1));
  const receivedPage = pageNumber(params.receivedPage),
    sentPage = pageNumber(params.sentPage);
  const pageSize = 20;

  const donor = await requireDonor();
  const t = await getTranslation();
  const locale = await getLocale();
  // Capture "new" markers first, then mark the opened request as read.
  const unreadIds = await unreadRequestIds(donor.userId!);
  const opened = params.request?.slice(0, 64);
  if (opened) await markRequestRead(donor.userId!, opened);
  const unread = await unreadCount(donor.userId!);
  const receivedSelect = {
    id: true,
    message: true,
    status: true,
    createdAt: true,
    expiresAt: true,
    requester: { select: { name: true } },
  } as const;
  const [pendingTotal, receivedTotal, sent, sentTotal, openedRow] =
    await Promise.all([
      db().contactRequest.count({
        where: { donorId: donor.id, status: "PENDING" },
      }),
      db().contactRequest.count({ where: { donorId: donor.id } }),
      db().contactRequest.findMany({
        where: { requesterId: donor.userId! },
        orderBy: { updatedAt: "desc" },
        take: pageSize,
        skip: (sentPage - 1) * pageSize,
        select: {
          id: true,
          message: true,
          status: true,
          createdAt: true,
          expiresAt: true,
          donor: { select: { name: true, publicId: true } },
        },
      }),
      db().contactRequest.count({ where: { requesterId: donor.userId! } }),
      opened
        ? db().contactRequest.findFirst({
            where: { id: opened, donorId: donor.id },
            select: receivedSelect,
          })
        : null,
    ]);
  const receivedOffset = (receivedPage - 1) * pageSize;
  const pendingRows = await db().contactRequest.findMany({
    where: { donorId: donor.id, status: "PENDING" },
    orderBy: { updatedAt: "desc" },
    take: Math.min(
      pageSize,
      Math.max(0, pendingTotal - receivedOffset),
    ),
    skip: Math.min(receivedOffset, pendingTotal),
    select: receivedSelect,
  });
  const receivedPageRows =
    pendingRows.length === pageSize
      ? pendingRows
      : [
          ...pendingRows,
          ...(await db().contactRequest.findMany({
            where: { donorId: donor.id, status: { not: "PENDING" } },
            orderBy: { updatedAt: "desc" },
            take: pageSize - pendingRows.length,
            skip: Math.max(0, receivedOffset - pendingTotal),
            select: receivedSelect,
          })),
        ];
  const received = openedRow
    ? [openedRow, ...receivedPageRows.filter((r) => r.id !== openedRow.id)]
    : receivedPageRows;
  const sharingEnabled =
    donor.sharePhone &&
    donor.visible &&
    !!donor.consentAt &&
    !donor.moderationBlocked &&
    !!donor.phone &&
    !!donor.bloodGroup &&
    !!donor.name;
  return (
    <>
      <div className="page-intro">
        <h1>{t("Contact requests")}</h1>
        <p>
          {t(
            "Your number stays private until you approve a signed-in person. Approval lasts 24 hours.",
          )}
        </p>
      </div>
      <NotificationStatus initial={unread} />
      <div className="notice">
        <p>
          {t(
            "You can decline or revoke access at any time. Revoking access prevents future reveals, but cannot erase a number someone has already seen.",
          )}
        </p>
        <Link href="/dashboard/profile">{t("Manage phone sharing")}</Link>
      </div>
      <section className="request-list">
        <h2>{t("Received requests")}</h2>
        {received.map((request) => (
          <article
            className={
              "dashboard-panel" +
              (unreadIds.has(request.id) || request.id === opened
                ? " new-request"
                : "")
            }
            id={"request-" + request.id}
            key={request.id}
          >
            <h3>
              {request.requester.name}
              {unreadIds.has(request.id) && (
                <span className="unread-badge">{t("New")}</span>
              )}
            </h3>
            <p className="muted">
              {dateLabel(request.createdAt, locale)} ·{" "}
              {t(contactStatus(request))}
            </p>
            <p className="request-message">{request.message}</p>
            <ContactDecision
              id={request.id}
              status={contactStatus(request)}
              sharingEnabled={sharingEnabled}
            />
            <ReportAbuse contactRequestId={request.id} />
          </article>
        ))}
        {!received.length && <p>{t("No contact requests yet.")}</p>}
        <nav className="pagination" aria-label={t("Received requests")}>
          {receivedPage > 1 && (
            <Link
              className="button secondary"
              href={`?receivedPage=${receivedPage - 1}&sentPage=${sentPage}`}
            >
              {t("Previous")}
            </Link>
          )}
          {receivedPage * pageSize < receivedTotal && (
            <Link
              className="button secondary"
              href={`?receivedPage=${receivedPage + 1}&sentPage=${sentPage}`}
            >
              {t("Next")}
            </Link>
          )}
        </nav>
      </section>
      <section className="request-list">
        <h2>{t("Sent requests")}</h2>
        {sent.map((request) => (
          <article className="dashboard-panel" key={request.id}>
            <h3>{request.donor.name}</h3>
            <p className="muted">
              {dateLabel(request.createdAt, locale)} ·{" "}
              {t(contactStatus(request))}
            </p>
            <p className="request-message">{request.message}</p>
            {contactStatus(request) === "APPROVED" && (
              <Link
                className="button secondary"
                href={"/donors/" + request.donor.publicId}
              >
                {t("View approved contact")}
              </Link>
            )}
            <ReportAbuse contactRequestId={request.id} />
          </article>
        ))}
        {!sent.length && <p>{t("You haven’t sent any contact requests.")}</p>}
        <nav className="pagination" aria-label={t("Sent requests")}>
          {sentPage > 1 && (
            <Link
              className="button secondary"
              href={`?receivedPage=${receivedPage}&sentPage=${sentPage - 1}`}
            >
              {t("Previous")}
            </Link>
          )}
          {sentPage * pageSize < sentTotal && (
            <Link
              className="button secondary"
              href={`?receivedPage=${receivedPage}&sentPage=${sentPage + 1}`}
            >
              {t("Next")}
            </Link>
          )}
        </nav>
      </section>
    </>
  );
}
