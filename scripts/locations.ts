import fs from "node:fs";
import path from "node:path";
export function loadLocations() {
  const source = JSON.parse(fs.readFileSync("data/source.json", "utf8"));
  const result: {
    id: string;
    name: string;
    bnName: string | null;
    type: string;
    parentId: string | null;
    source: string;
  }[] = [];
  const levels = [
    ["divisions", "DIVISION", null],
    ["districts", "DISTRICT", "division_id"],
    ["upazilas", "UPAZILA", "district_id"],
    ["unions", "UNION", "upazilla_id"],
  ] as const;
  for (let i = 0; i < levels.length; i++) {
    const [file, type, parentKey] = levels[i];
    const parsed = JSON.parse(
      fs.readFileSync(path.join("data", file + ".json"), "utf8"),
    );
    const rows = parsed.find((x: { type: string }) => x.type === "table").data;
    for (const r of rows) {
      result.push({
        id: type.toLowerCase() + ":" + r.id,
        name: r.name,
        bnName: r.bn_name || null,
        type,
        parentId: parentKey
          ? levels[i - 1][1].toLowerCase() + ":" + r[parentKey]
          : null,
        source: source.repository + "@" + source.commit,
      });
    }
  }
  const ids = new Set<string>();
  for (const row of result) {
    if (ids.has(row.id) || !row.name?.trim())
      throw new Error("Duplicate ID or missing name: " + row.id);
    ids.add(row.id);
  }
  for (const row of result)
    if (row.parentId && !ids.has(row.parentId))
      throw new Error("Missing parent: " + row.id);
  return result;
}
if (process.argv[1]?.endsWith("locations.ts")) {
  const rows = loadLocations();
  console.log(
    Object.fromEntries(
      ["DIVISION", "DISTRICT", "UPAZILA", "UNION"].map((type) => [
        type,
        rows.filter((r) => r.type === type).length,
      ]),
    ),
  );
  console.log(
    "Urban thana/ward coverage is incomplete; this is a 2023 upstream snapshot, not verified current nationwide coverage.",
  );
}
