import { db } from "./db";
export const publicSelect = {
  publicId: true,
  name: true,
  bloodGroup: true,
  divisionId: true,
  districtId: true,
  localityId: true,
  areaId: true,
  imageUrl: true,
  available: true,
  donationCount: true,
  lastDonation: true,
} as const;
export const published = {
  visible: true,
  userId: { not: null },
  phone: { not: null },
  consentAt: { not: null },
  name: { not: "" },
  bloodGroup: { not: "" },
};
export async function locationLabel(ids: (string | null)[]) {
  const records = await db().location.findMany({
    where: { id: { in: ids.filter((id): id is string => !!id) } },
  });
  return ids
    .map((id) => records.find((r) => r.id === id)?.name)
    .filter(Boolean)
    .reverse()
    .join(", ");
}
export async function validateHierarchy(v: {
  divisionId: string;
  districtId: string | null;
  localityId: string | null;
  areaId: string | null;
}) {
  const ids = [v.divisionId, v.districtId, v.localityId, v.areaId];
  const rows = await db().location.findMany({
    where: { id: { in: ids.filter((x): x is string => !!x) } },
  });
  for (let i = 0; i < 4; i++) {
    if (!ids[i]) {
      if (ids.slice(i + 1).some(Boolean))
        throw new Error("Select the parent location first.");
      continue;
    }
    const row = rows.find((r) => r.id === ids[i]);
    const allowed = [
      ["DIVISION"],
      ["DISTRICT"],
      ["UPAZILA", "THANA"],
      ["UNION", "WARD", "AREA"],
    ][i];
    if (
      !row ||
      !allowed.includes(row.type) ||
      row.parentId !== (i ? ids[i - 1] : null)
    )
      throw new Error("Invalid location hierarchy.");
  }
}
