import Link from "next/link";
import { notFound } from "next/navigation";
import { currentAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { getLocale, getTranslation } from "@/lib/i18n-server";
import { dateLabel } from "@/lib/format";
import { ResolveReport } from "@/components/contact-requests";
export default async function ReportsPage() {
  if (!(await currentAdmin())) notFound();
  const t = await getTranslation();
  const locale = await getLocale();
  const reports = await db().abuseReport.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      reason: true,
      details: true,
      createdAt: true,
      reporter: { select: { name: true } },
      targetUser: { select: { id: true, name: true } },
    },
  });
  return (
    <>
      <div className="page-intro">
        <h1>{t("Abuse reports")}</h1>
        <p>
          {t(
            "Review unwanted contact and spam reports. Use account management to suspend abusive users.",
          )}
        </p>
      </div>
      {reports.map((report) => (
        <article className="dashboard-panel" key={report.id}>
          <h2>{t(report.reason)}</h2>
          <p>
            {t("Reported by")}: {report.reporter.name}
          </p>
          <p>
            {t("Reported account")}:{" "}
            <Link
              className="text-link"
              href={"/admin/users/" + report.targetUser.id}
            >
              {report.targetUser.name}
            </Link>
          </p>
          <p className="request-message">{report.details}</p>
          <p className="muted">{dateLabel(report.createdAt, locale)}</p>
          <ResolveReport id={report.id} />
        </article>
      ))}
      {!reports.length && <p>{t("No open abuse reports.")}</p>}
    </>
  );
}
