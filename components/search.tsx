"use client";
import { useTranslation } from "@/components/language";

import { Locations } from "./locations";
import { bloodGroups } from "@/lib/validation";
import { Search } from "lucide-react";
export function SearchForm({
  filters = {},
  compact = false,
}: {
  filters?: Record<string, string>;
  compact?: boolean;
}) {
  const t = useTranslation();

  return (
    <form action="/find-donors" className="search-panel">
      <div className="panel-heading">
        <Search size={20} />
        <span>{t("Find a donor")}</span>
        <span className="muted">{t("No account needed")}</span>
      </div>
      <fieldset className="blood-group-picker">
        <legend>
          {t("Blood group")} <span className="red">*</span>
        </legend>
        <div>
          {bloodGroups.map((group) => (
            <label key={group}>
              <input
                type="radio"
                name="bloodGroup"
                value={group}
                required
                defaultChecked={filters.bloodGroup === group}
              />
              <span>{group}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <details
        className="search-location-options"
        open={Object.keys(filters).some(
          (key) => key.endsWith("Id") && !!filters[key],
        )}
      >
        <summary>
          {t("Location")} <span>{t("Optional")}</span>
        </summary>
        <Locations compact key={JSON.stringify(filters)} initial={filters} />
      </details>
      {!compact && (
        <div className="filter-bottom">
          <label className="check">
            <input
              type="checkbox"
              name="available"
              value="true"
              defaultChecked={filters.available === "true"}
            />{" "}
            {t("Available only")}{" "}
          </label>
          <label>
            {t("Sort by")}{" "}
            <select name="sort" defaultValue={filters.sort || "available"}>
              <option value="available">{t("Available first")}</option>
              <option value="updated">{t("Recently updated")}</option>
              <option value="donations">{t("Most donations")}</option>
            </select>
          </label>
        </div>
      )}
      <button className="button full">
        <Search size={18} />
        {t("Find donors")}{" "}
      </button>
      <p className="muted">
        {t("Exact blood-group matches. Location is optional.")}
      </p>
    </form>
  );
}
