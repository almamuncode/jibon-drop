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
      <label htmlFor="bloodGroup">
        {t("Blood group")} <span className="red">*</span>
      </label>
      <select
        id="bloodGroup"
        name="bloodGroup"
        required
        defaultValue={filters.bloodGroup || ""}
      >
        <option value="">{t("Choose blood group")}</option>
        {bloodGroups.map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
      <Locations key={JSON.stringify(filters)} initial={filters} />
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
