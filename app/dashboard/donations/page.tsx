import { getTranslation } from "@/lib/i18n-server";
import { requireDonor } from "@/lib/security";
import { db } from "@/lib/db";
import { dhakaToday } from "@/lib/validation";
import { Donations } from "@/components/donations";
export default async function DonationPage() {
  const t = await getTranslation();

  const d = await requireDonor();
  const records = await db().donation.findMany({
    where: { donorId: d.id },
    orderBy: { date: "desc" },
  });
  return (
    <div className="editor-width">
      <div className="page-intro">
        <h1>{t("Donation records")}</h1>
        <p>
          {t(
            "Your notes stay private. Only the count and last date are public.",
          )}
        </p>
      </div>
      <Donations
        today={dhakaToday()}
        records={records.map((r) => ({
          ...r,
          date: r.date.toISOString().slice(0, 10),
        }))}
      />
    </div>
  );
}
