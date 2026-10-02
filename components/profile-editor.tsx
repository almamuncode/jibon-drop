"use client";
import { useTranslation } from "@/components/language";

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
  sharePhone: boolean;
  available: boolean;
  consent: boolean;
  hasPhoto: boolean;
  phone: string;
  imageUrl: string | null;
  location: string;
};
export function ProfileEditor({ profile: p }: { profile: Profile }) {
  const t = useTranslation();

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
            <span className="eyebrow">{t("My donor profile")}</span>
            <h2>{p.name || t("Complete your profile")}</h2>
            <p>{p.location || t("Location not set")}</p>
          </div>
          <span className="blood-badge">{p.bloodGroup || "—"}</span>
        </div>
        <dl className="profile-details">
          <div>
            <dt>{t("Contact number")}</dt>
            <dd>{p.phone || t("Not added")}</dd>
          </div>
          <div>
            <dt>{t("Availability")}</dt>
            <dd>{p.available ? t("Willing to donate") : t("Unavailable")}</dd>
          </div>
          <div>
            <dt>{t("Phone sharing")}</dt>
            <dd>{p.sharePhone ? t("Only with my approval") : t("Disabled")}</dd>
          </div>
          <div>
            <dt>{t("Directory listing")}</dt>
            <dd>{p.visible && p.consent ? t("Public") : t("Private")}</dd>
          </div>
          <div>
            <dt>{t("Public profile consent")}</dt>
            <dd>{p.consent ? t("Given") : t("Not given")}</dd>
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
          {t("Change profile")}{" "}
        </button>
        {message && <p role="status">{t.error(message)}</p>}
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
              sharePhone: f.get("sharePhone") === "on",
              consent: f.get("consent") === "on",
            });
            setMessage(t("Profile saved."));
            setEditing(false);
            router.refresh();
          } catch (e) {
            setMessage((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label htmlFor="name">{t("Full name")}</label>
        <input
          id="name"
          name="name"
          required
          minLength={2}
          maxLength={80}
          defaultValue={p.name}
          autoComplete="name"
        />
        <label htmlFor="contact-phone">{t("Contact mobile number")}</label>
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
          {t(
            "Used for donor contact, never for login. Numbers are self-reported and not verified by JibonDrop.",
          )}{" "}
        </p>
        <label htmlFor="profile-blood">{t("Blood group")}</label>
        <select
          id="profile-blood"
          name="bloodGroup"
          defaultValue={p.bloodGroup}
          required
        >
          <option value="">{t("Choose blood group")}</option>
          {bloodGroups.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <Locations required initial={loc} onChange={setLoc} />
        <label htmlFor="fallbackArea">
          {t("Area not listed — private area description")}{" "}
        </label>
        <input
          id="fallbackArea"
          name="fallbackArea"
          maxLength={120}
          defaultValue={p.fallbackArea || ""}
          placeholder={t("Use only if your locality or area is missing")}
        />
        <p className="muted">
          {t(
            "This text stays private and is linked to your selected parent location.",
          )}{" "}
        </p>
        <label className="check">
          <input
            name="available"
            type="checkbox"
            defaultChecked={p.available}
          />
          {t("I’m currently willing to donate")}{" "}
        </label>
        <p className="muted">{t("This is not medical clearance.")}</p>
        <label className="check">
          <input
            id="profile-consent"
            name="consent"
            type="checkbox"
            defaultChecked={p.consent}
            required={visible}
            aria-describedby="listing-consent-help"
          />
          {t(
            "I consent to a public donor profile. My number is shared only with people I approve.",
          )}{" "}
        </label>
        <label className="check">
          <input
            name="sharePhone"
            type="checkbox"
            defaultChecked={p.sharePhone}
          />
          {t(
            "Accept contact requests and share my number only after I approve.",
          )}
        </label>
        <p className="muted">
          {t(
            "Turning this off revokes approved access. Your directory listing can stay visible.",
          )}
        </p>
        <label className="check">
          <input
            name="visible"
            type="checkbox"
            checked={visible}
            onChange={(e) => setVisible(e.target.checked)}
          />
          {t("Show my listing in the donor directory")}{" "}
        </label>
        <p className="muted" id="listing-consent-help">
          {t(
            "To publish your listing, check the contact-sharing consent box above. You can save a private profile by leaving the listing option off.",
          )}{" "}
          {t(
            "Anyone can search listed donors. Only signed-in people can request contact, and you approve each request. Withdraw consent or hide your listing at any time.",
          )}{" "}
        </p>
        <button className="button" disabled={busy}>
          {busy ? t("Saving…") : t("Save profile")}
        </button>
        <button
          className="text-button"
          type="button"
          disabled={busy}
          onClick={() => setEditing(false)}
        >
          {t("Cancel")}{" "}
        </button>
        <p role="status">{t.error(message)}</p>
      </form>
      <div className="dashboard-panel">
        <PhotoEditor hasPhoto={p.hasPhoto} />
      </div>
    </>
  );
}
