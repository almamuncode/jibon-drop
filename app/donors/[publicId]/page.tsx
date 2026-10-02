import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { published, publicSelect, locationLabel } from "@/lib/public";
import { Avatar, dateLabel } from "@/components/ui";
import { Contact } from "@/components/contact";
export const dynamic = "force-dynamic";
export default async function Profile({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
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
          {await locationLabel([
            d.divisionId,
            d.districtId,
            d.localityId,
            d.areaId,
          ])}
        </p>
        <span className="status">
          {d.available ? "Available" : "Temporarily unavailable"}
        </span>
        <dl>
          <div>
            <dt>Donations recorded (self-reported)</dt>
            <dd>{d.donationCount}</dd>
          </div>
          <div>
            <dt>Last recorded donation</dt>
            <dd>{dateLabel(d.lastDonation)}</dd>
          </div>
        </dl>
        <Contact publicId={d.publicId} />
        <p className="muted">
          Availability reflects willingness, not medical clearance. Confirm
          eligibility with the relevant blood bank or healthcare professional.
          Missing records do not establish donation history.
        </p>
      </article>
    </div>
  );
}
