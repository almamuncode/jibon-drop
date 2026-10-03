"use client";
import { useLocale, useTranslation } from "@/components/language";

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
  compact = false,
}: {
  initial?: Partial<LocationValue>;
  onChange?: (v: LocationValue) => void;
  required?: boolean;
  compact?: boolean;
}) {
  const t = useTranslation();
  const locale = useLocale();

  const [value, setValue] = useState<LocationValue>({
    divisionId: "",
    districtId: "",
    localityId: "",
    areaId: "",
    ...initial,
  });
  const [options, setOptions] = useState<Item[][]>([[], [], [], []]);
  const [searching, setSearching] = useState(false);
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
      {compact && (
        <button
          className="text-button location-search-toggle"
          type="button"
          aria-expanded={searching}
          onClick={() => {
            setSearching(!searching);
            setQueries(["", "", "", ""]);
          }}
        >
          {searching ? t("Hide location search") : t("Search location options")}
        </button>
      )}
      <div
        className={`location-grid${compact && !searching ? " location-grid-simple" : ""}`}
      >
        {keys.map((key, i) => (
          <div key={key}>
            <label htmlFor={key}>
              {
                [
                  t("Division"),
                  t("District"),
                  t("Upazila / Thana"),
                  t("Union / Ward / Area"),
                ][i]
              }
            </label>
            {(!compact || searching) && (
              <input
                aria-label={
                  t("Search ") +
                  [t("divisions"), t("districts"), t("localities"), t("areas")][
                    i
                  ]
                }
                placeholder={t("Type to filter options")}
                value={queries[i]}
                disabled={i > 0 && !value[keys[i - 1]]}
                onChange={(e) =>
                  setQueries(
                    queries.map((q, j) => (i === j ? e.target.value : q)),
                  )
                }
              />
            )}
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
                  ? t("Area not listed / choose below")
                  : t("All ") +
                    [
                      t("divisions"),
                      t("districts"),
                      t("localities"),
                      t("areas"),
                    ][i]}
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
                    {locale === "bn" ? x.bnName || x.name : x.name}
                  </option>
                ))}
            </select>
          </div>
        ))}
      </div>
      {loading && (
        <p className="muted" role="status">
          {t("Loading locations…")}{" "}
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {t.error(error)}
        </p>
      )}
      {required && (
        <p className="muted">
          {t(
            "Urban areas may be missing. Choose the known parent and use the private area field below; don’t select an unrelated union.",
          )}{" "}
        </p>
      )}
    </>
  );
}
