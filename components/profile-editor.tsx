"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Locations, LocationValue } from "./locations";
import { PhotoEditor } from "./photo";
import { api } from "./dashboard";
import { bloodGroups } from "@/lib/validation";
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
  const [message, setMessage] = useState("");
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
          <input name="consent" type="checkbox" defaultChecked={p.consent} />I
          consent to a public donor profile and to sharing my mobile number
          through the contact action.
        </label>
        <label className="check">
          <input name="visible" type="checkbox" defaultChecked={p.visible} />
          Show my listing in the donor directory
        </label>
        <p className="muted">
          Anyone can search and contact listed donors. Withdraw consent or hide
          your listing at any time.
        </p>
        <button className="button" disabled={busy}>
          {busy ? "Saving…" : "Save profile"}
        </button>
        <p role="status">{message}</p>
      </form>
      <div className="dashboard-panel">
        <PhotoEditor hasPhoto={p.hasPhoto} />
      </div>
    </>
  );
}
