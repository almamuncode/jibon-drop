"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Locations, LocationValue } from "./locations";
import { PhotoEditor } from "./photo";
import { api } from "./dashboard";
import { bloodGroups } from "@/lib/validation";
import { Avatar } from "./ui";
type Profile = {
  name: string;
  bloodGroup: string;
  divisionId: string | null;
  districtId: string | null;
  localityId: string | null;
  areaId: string | null;
  fallbackArea: string | null;
  visible: boolean;
  available: boolean;
  consent: boolean;
  hasPhoto: boolean;
  phone: string;
  imageUrl: string | null;
  location: string;
};
export function ProfileEditor({ profile: p }: { profile: Profile }) {
  const router = useRouter();
  const [loc, setLoc] = useState<LocationValue>({
    divisionId: p.divisionId || "",
    districtId: p.districtId || "",
    localityId: p.localityId || "",
    areaId: p.areaId || "",
  });
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [visible, setVisible] = useState(p.visible);
  const [message, setMessage] = useState("");
  if (!editing)
    return (
      <section className="profile-overview dashboard-panel">
        <div className="profile-identity">
          <Avatar name={p.name} url={p.imageUrl} />
          <div>
            <span className="eyebrow">My donor profile</span>
            <h2>{p.name || "Complete your profile"}</h2>
            <p>{p.location || "Location not set"}</p>
          </div>
          <span className="blood-badge">{p.bloodGroup || "—"}</span>
        </div>
        <dl className="profile-details">
          <div>
            <dt>Contact number</dt>
            <dd>{p.phone || "Not added"}</dd>
          </div>
          <div>
            <dt>Availability</dt>
            <dd>{p.available ? "Willing to donate" : "Unavailable"}</dd>
          </div>
          <div>
            <dt>Directory listing</dt>
            <dd>{p.visible && p.consent ? "Public" : "Private"}</dd>
          </div>
          <div>
            <dt>Contact-sharing consent</dt>
            <dd>{p.consent ? "Given" : "Not given"}</dd>
          </div>
        </dl>
        <button
          className="button"
          type="button"
          onClick={() => {
            setMessage("");
            setLoc({
              divisionId: p.divisionId || "",
              districtId: p.districtId || "",
              localityId: p.localityId || "",
              areaId: p.areaId || "",
            });
            setVisible(p.visible);
            setEditing(true);
          }}
        >
          Change profile
        </button>
        {message && <p role="status">{message}</p>}
      </section>
    );
  return (
    <>
      <form
        className="dashboard-panel"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const f = new FormData(e.currentTarget);
          try {
            await api("profile", {
              name: f.get("name"),
              phone: f.get("phone"),
              bloodGroup: f.get("bloodGroup"),
              ...loc,
              localityId: loc.localityId || null,
              areaId: loc.areaId || null,
              fallbackArea: f.get("fallbackArea") || null,
              available: f.get("available") === "on",
              visible: f.get("visible") === "on",
              consent: f.get("consent") === "on",
            });
            setMessage("Profile saved.");
            setEditing(false);
            router.refresh();
          } catch (e) {
            setMessage((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label htmlFor="name">Full name</label>
        <input
          id="name"
          name="name"
          required
          minLength={2}
          maxLength={80}
          defaultValue={p.name}
          autoComplete="name"
        />
        <label htmlFor="contact-phone">Contact mobile number</label>
        <input
          id="contact-phone"
          name="phone"
          type="tel"
          required
          autoComplete="tel"
          defaultValue={p.phone}
          placeholder="01XXXXXXXXX"
        />
        <p className="muted">
          Used for donor contact, never for login. Numbers are self-reported and
          not verified by JibonDrop.
        </p>
        <label htmlFor="profile-blood">Blood group</label>
        <select
          id="profile-blood"
          name="bloodGroup"
          defaultValue={p.bloodGroup}
          required
        >
          <option value="">Choose blood group</option>
          {bloodGroups.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <Locations required initial={loc} onChange={setLoc} />
        <label htmlFor="fallbackArea">
          Area not listed — private area description
        </label>
        <input
          id="fallbackArea"
          name="fallbackArea"
          maxLength={120}
          defaultValue={p.fallbackArea || ""}
          placeholder="Use only if your locality or area is missing"
        />
        <p className="muted">
          This text stays private and is linked to your selected parent
          location.
        </p>
        <label className="check">
          <input
            name="available"
            type="checkbox"
            defaultChecked={p.available}
          />
          I’m currently willing to donate
        </label>
        <p className="muted">This is not medical clearance.</p>
        <label className="check">
          <input
            id="profile-consent"
            name="consent"
            type="checkbox"
            defaultChecked={p.consent}
            required={visible}
            aria-describedby="listing-consent-help"
          />
          I consent to a public donor profile and to sharing my mobile number
          through the contact action.
        </label>
        <label className="check">
          <input
            name="visible"
            type="checkbox"
            checked={visible}
            onChange={(e) => setVisible(e.target.checked)}
          />
          Show my listing in the donor directory
        </label>
        <p className="muted" id="listing-consent-help">
          To publish your listing, check the contact-sharing consent box above.
          You can save a private profile by leaving the listing option off.{" "}
          Anyone can search and contact listed donors. Withdraw consent or hide
          your listing at any time.
        </p>
        <button className="button" disabled={busy}>
          {busy ? "Saving…" : "Save profile"}
        </button>
        <button
          className="text-button"
          type="button"
          disabled={busy}
          onClick={() => setEditing(false)}
        >
          Cancel
        </button>
        <p role="status">{message}</p>
      </form>
      <div className="dashboard-panel">
        <PhotoEditor hasPhoto={p.hasPhoto} />
      </div>
    </>
  );
}
