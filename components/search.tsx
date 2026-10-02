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
  return (
    <form action="/find-donors" className="search-panel">
      <div className="panel-heading">
        <Search size={20} />
        <span>Find a donor</span>
        <span className="muted">No account needed</span>
      </div>
      <label htmlFor="bloodGroup">
        Blood group <span className="red">*</span>
      </label>
      <select
        id="bloodGroup"
        name="bloodGroup"
        required
        defaultValue={filters.bloodGroup || ""}
      >
        <option value="">Choose blood group</option>
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
            Available only
          </label>
          <label>
            Sort by
            <select name="sort" defaultValue={filters.sort || "available"}>
              <option value="available">Available first</option>
              <option value="updated">Recently updated</option>
              <option value="donations">Most donations</option>
            </select>
          </label>
        </div>
      )}
      <button className="button full">
        <Search size={18} />
        Find donors
      </button>
      <p className="muted">Exact blood-group matches. Location is optional.</p>
    </form>
  );
}
