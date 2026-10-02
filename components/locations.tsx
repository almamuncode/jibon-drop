"use client";
import { useEffect, useState } from "react";
type Item = { id: string; name: string; bnName: string | null; type: string };
export type LocationValue = {
  divisionId: string;
  districtId: string;
  localityId: string;
  areaId: string;
};
const keys = ["divisionId", "districtId", "localityId", "areaId"] as const;
export function Locations({
  initial,
  onChange,
  required = false,
}: {
  initial?: Partial<LocationValue>;
  onChange?: (v: LocationValue) => void;
  required?: boolean;
}) {
  const [value, setValue] = useState<LocationValue>({
    divisionId: "",
    districtId: "",
    localityId: "",
    areaId: "",
    ...initial,
  });
  const [options, setOptions] = useState<Item[][]>([[], [], [], []]);
  const [queries, setQueries] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all(
      keys.map((_, i) =>
        i && !value[keys[i - 1]]
          ? Promise.resolve([])
          : fetch(
              "/api/locations" +
                (i ? "?parent=" + encodeURIComponent(value[keys[i - 1]]) : ""),
            ).then(async (r) => {
              const data = await r.json();
              if (!r.ok) throw new Error(data.error);
              return data;
            }),
      ),
    )
      .then((data) => {
        if (active) {
          setOptions(data);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [value]);
  function change(i: number, id: string) {
    setLoading(true);
    const next = { ...value };
    keys.forEach((key, j) => {
      if (j >= i) next[key] = j === i ? id : "";
    });
    setValue(next);
    setQueries(["", "", "", ""]);
    onChange?.(next);
  }
  return (
    <>
      <div className="location-grid">
        {keys.map((key, i) => (
          <div key={key}>
            <label htmlFor={key}>
              {
                [
                  "Division",
                  "District",
                  "Upazila / Thana",
                  "Union / Ward / Area",
                ][i]
              }
            </label>
            <input
              aria-label={
                "Search " + ["divisions", "districts", "localities", "areas"][i]
              }
              placeholder="Type to filter options"
              value={queries[i]}
              disabled={i > 0 && !value[keys[i - 1]]}
              onChange={(e) =>
                setQueries(
                  queries.map((q, j) => (i === j ? e.target.value : q)),
                )
              }
            />
            <select
              id={key}
              name={key}
              value={value[key]}
              required={required && i < 2}
              disabled={i > 0 && !value[keys[i - 1]]}
              onChange={(e) => change(i, e.target.value)}
            >
              <option value="">
                {required && i >= 2
                  ? "Area not listed / choose below"
                  : "All " +
                    ["divisions", "districts", "localities", "areas"][i]}
              </option>
              {options[i]
                .filter(
                  (x) =>
                    x.id === value[key] ||
                    (x.name + " " + x.bnName)
                      .toLowerCase()
                      .includes(queries[i].toLowerCase()),
                )
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                    {x.bnName ? " · " + x.bnName : ""}
                  </option>
                ))}
            </select>
          </div>
        ))}
      </div>
      {loading && (
        <p className="muted" role="status">
          Loading locations…
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {required && (
        <p className="muted">
          Urban areas may be missing. Choose the known parent and use the
          private area field below; don’t select an unrelated union.
        </p>
      )}
    </>
  );
}
