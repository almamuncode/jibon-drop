"use client";
import { useTranslation } from "@/components/language";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Locations, LocationValue } from "./locations";
import { PhotoEditor } from "./photo";
import Link from "next/link";
import { Pencil, CircleHelp, Settings, ChevronRight } from "lucide-react";
import { StatusControls } from "./dashboard";
import { api } from "./dashboard";
import { bloodGroups, dhakaToday } from "@/lib/validation";
import { Avatar } from "./ui";
import { FacebookIcon } from "./facebook-icon";
type Profile = {
  name: string;
  donationCount: number;
  requestCount: number;
  bloodGroup: string;
  dateOfBirth: string;
  weightKg: number | null;
  divisionId: string | null;
  districtId: string | null;
  localityId: string | null;
  areaId: string | null;
  fallbackArea: string | null;
  visible: boolean;
  sharePhone: boolean;
  phonePublic: boolean;
  facebook: string;
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
  const [detailsOpen, setDetailsOpen] = useState(false);
  useEffect(() => {
    const desktop = matchMedia("(min-width: 641px)");
    const sync = () => setDetailsOpen(desktop.matches);
    sync();
    desktop.addEventListener("change", sync);
    return () => desktop.removeEventListener("change", sync);
  }, []);
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
        <div className="mobile-profile-content">
          <div className="mobile-profile-stats">
            <div>
              <strong>{p.bloodGroup || "—"}</strong>
              <span>{t("Blood group")}</span>
            </div>
            <div>
              <strong>{p.donationCount}</strong>
              <span>{t("Recorded donations")}</span>
            </div>
            <div>
              <strong>{p.requestCount}</strong>
              <span>{t("Contact requests")}</span>
            </div>
          </div>
          <div className="mobile-profile-availability">
            <StatusControls
              key={`${p.available}-${p.visible}`}
              available={p.available}
              visible={p.visible}
            />
          </div>
          <Link className="mobile-profile-action" href="/dashboard/settings">
            <Settings size={18} aria-hidden="true" />
            <span>{t("Settings")}</span>
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
          <Link className="mobile-profile-action" href="/guide">
            <CircleHelp size={18} aria-hidden="true" />
            <span>{t("User Guide")}</span>
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <details
          className="profile-summary-details"
          open={detailsOpen}
          onToggle={(event) => setDetailsOpen(event.currentTarget.open)}
        >
          <summary>{t("Profile details")}</summary>
          <dl className="profile-details">
            <div>
              <dt>{t("Contact number")}</dt>
              <dd>{p.phone || t("Not added")}</dd>
            </div>
            <div>
              <dt>{t("Date of birth")}</dt>
              <dd>{p.dateOfBirth || t("Not added")}</dd>
            </div>
            <div>
              <dt>{t("Weight (kg)")}</dt>
              <dd>{p.weightKg ?? t("Not added")}</dd>
            </div>
            <div>
              <dt>Facebook</dt>
              <dd>{p.facebook || t("Not added")}</dd>
            </div>
            <div>
              <dt>{t("Availability")}</dt>
              <dd>
                <span
                  className={`profile-detail-status${p.available ? " positive" : ""}`}
                >
                  {p.available ? t("Willing to donate") : t("Unavailable")}
                </span>
              </dd>
            </div>
            <div>
              <dt>{t("Phone sharing")}</dt>
              <dd>
                {!p.sharePhone
                  ? t("Disabled")
                  : p.phonePublic
                    ? t("Visible to signed-in users")
                    : t("Only with my approval")}
              </dd>
            </div>
            <div>
              <dt>{t("Directory listing")}</dt>
              <dd>
                <span
                  className={`profile-detail-status${p.visible && p.consent ? " positive" : ""}`}
                >
                  {p.visible && p.consent ? t("Public") : t("Private")}
                </span>
              </dd>
            </div>
            <div>
              <dt>{t("Public profile consent")}</dt>
              <dd>{p.consent ? t("Given") : t("Not given")}</dd>
            </div>
          </dl>
        </details>
        <button
          className="button profile-edit-button"
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
          <Pencil size={16} aria-hidden="true" /> {t("Change profile")}{" "}
        </button>
        {message && <p role="status">{t.error(message)}</p>}
      </section>
    );
  return (
    <>
      <form
        className="dashboard-panel profile-form"
        onInvalidCapture={(event) => {
          const details = (event.target as HTMLElement).closest("details");
          if (details) details.open = true;
        }}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const f = new FormData(e.currentTarget);
          try {
            await api("profile", {
              name: f.get("name"),
              phone: f.get("phone"),
              bloodGroup: f.get("bloodGroup"),
              dateOfBirth: f.get("dateOfBirth") || null,
              weightKg: f.get("weightKg") ? Number(f.get("weightKg")) : null,
              ...loc,
              localityId: loc.localityId || null,
              areaId: loc.areaId || null,
              fallbackArea: f.get("fallbackArea") || null,
              available: f.get("available") === "on",
              visible: f.get("visible") === "on",
              sharePhone: f.get("sharePhone") === "on",
              phonePublic: f.get("phonePublic") === "on",
              facebook: f.get("facebook") || null,
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
        <div className="profile-form-heading">
          <h2>{t("Edit donor profile")}</h2>
          <p className="muted">
            {t("Keep your contact details and location up to date.")}
          </p>
        </div>
        <fieldset className="profile-section">
          <legend>{t("Personal details")}</legend>
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
          <div className="profile-health-fields">
            <div>
              <label htmlFor="dateOfBirth">
                {t("Date of birth (optional)")}
              </label>
              <input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                min="1900-01-01"
                max={dhakaToday()}
                defaultValue={p.dateOfBirth}
                autoComplete="bday"
              />
            </div>
            <div>
              <label htmlFor="weightKg">{t("Weight in kg (optional)")}</label>
              <input
                id="weightKg"
                name="weightKg"
                type="number"
                inputMode="decimal"
                min="0.1"
                max="500"
                step="0.1"
                defaultValue={p.weightKg ?? ""}
                placeholder="65"
              />
            </div>
          </div>
          <p className="muted">
            {t("Your date of birth and weight stay private.")}
          </p>
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
          <label htmlFor="facebook">{t("Facebook (optional)")}</label>
          <div className="facebook-field">
            <a
              className="button secondary"
              href="https://www.facebook.com/me"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("Open Facebook to copy your profile link")}
            >
              <FacebookIcon />
            </a>
            <input
              id="facebook"
              name="facebook"
              maxLength={200}
              defaultValue={p.facebook}
              placeholder={t("username or facebook.com link")}
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>
          <p className="muted">
            {t(
              "Tap the icon to open Facebook, copy your profile link, then paste it here. It is shared the same way as your phone number.",
            )}
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
        </fieldset>
        <fieldset className="profile-section">
          <legend>{t("Location")}</legend>
          <Locations required compact initial={loc} onChange={setLoc} />
          <details className="profile-extra">
            <summary>{t("Area not listed?")}</summary>
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
          </details>
        </fieldset>
        <fieldset className="profile-section profile-preferences">
          <legend>{t("Availability")}</legend>
          <label className="preference-row">
            <span>{t("Available to donate now")}</span>
            <input
              name="available"
              type="checkbox"
              role="switch"
              defaultChecked={p.available}
            />
          </label>
          <p className="muted">{t("This is not medical clearance.")}</p>
        </fieldset>
        <fieldset className="profile-section profile-preferences">
          <legend>{t("Privacy & listing")}</legend>
          <label className="preference-row">
            <span>{t("List me in the donor directory")}</span>
            <input
              name="visible"
              type="checkbox"
              role="switch"
              checked={visible}
              onChange={(e) => setVisible(e.target.checked)}
            />
          </label>
          <label className="preference-row">
            <span>{t("I consent to a public donor profile")}</span>
            <input
              id="profile-consent"
              name="consent"
              type="checkbox"
              defaultChecked={p.consent}
              required={visible}
              aria-describedby="listing-consent-help"
            />
          </label>
          <p className="muted" id="listing-consent-help">
            {t(
              "Consent is required to list your profile. You can withdraw it at any time.",
            )}
          </p>
          <label className="preference-row">
            <span>{t("Accept contact requests")}</span>
            <input
              name="sharePhone"
              type="checkbox"
              role="switch"
              defaultChecked={p.sharePhone}
            />
          </label>
          <label className="preference-row">
            <span>
              {t("Share my number without approval")}
              <small>{t("Signed-in users only")}</small>
            </span>
            <input
              name="phonePublic"
              type="checkbox"
              role="switch"
              defaultChecked={p.phonePublic}
            />
          </label>
          <details className="profile-extra privacy-help">
            <summary>{t("How contact sharing works")}</summary>
            <p className="muted">
              {t(
                "When contact requests are enabled, you approve each request unless you enable sharing without approval. Turning requests off revokes approved access. Signed-out visitors never see your number. Facebook follows the same sharing settings.",
              )}
            </p>
            <p className="muted">
              {t(
                "Anyone can search listed profiles. Turn off your directory listing to hide yours.",
              )}
            </p>
          </details>
        </fieldset>
        <div className="actions profile-form-actions">
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
        </div>
        {message && <p role="status">{t.error(message)}</p>}
      </form>
      <div className="dashboard-panel">
        <PhotoEditor hasPhoto={p.hasPhoto} />
      </div>
    </>
  );
}
