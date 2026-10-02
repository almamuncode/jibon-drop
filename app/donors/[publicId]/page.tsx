import { dateLabel } from "@/lib/format";
import { getLocale, getTranslation } from "@/lib/i18n-server";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { published, publicSelect, locationLabel } from "@/lib/public";
import { Avatar } from "@/components/ui";
import { Contact } from "@/components/contact";
export const dynamic = "force-dynamic";
export default async function Profile({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const t = await getTranslation();
  const locale = await getLocale();

  const d = await db().donor.findFirst({
    where: { ...published, publicId: (await params).publicId },
    select: publicSelect,
  });
  if (!d) notFound();
  return (
    <div className="container narrow">
      <article className="profile-card">
        <Avatar name={d.name} url={d.imageUrl} />
        <span className="blood-badge">{d.bloodGroup}</span>
        <h1>{d.name}</h1>
        <p>
          {await locationLabel(
            [d.divisionId, d.districtId, d.localityId, d.areaId],
            locale,
          )}
        </p>
        <span className="status">
          {d.available ? t("Available") : t("Temporarily unavailable")}
        </span>
        <dl>
          <div>
            <dt>{t("Donations recorded (self-reported)")}</dt>
            <dd>{d.donationCount}</dd>
          </div>
          <div>
            <dt>{t("Last recorded donation")}</dt>
            <dd>{dateLabel(d.lastDonation, locale)}</dd>
          </div>
        </dl>
        <Contact publicId={d.publicId} />
        <p className="muted">
          {t(
            "Availability reflects willingness, not medical clearance. Confirm eligibility with the relevant blood bank or healthcare professional. Missing records do not establish donation history.",
          )}{" "}
        </p>
      </article>
    </div>
  );
}
