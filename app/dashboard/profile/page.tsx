import { requireDonor } from "@/lib/security";
import { ProfileEditor } from "@/components/profile-editor";
import { AccountActions } from "@/components/dashboard";
import { locationLabel } from "@/lib/public";
export default async function EditProfile() {
  const d = await requireDonor();
  return (
    <div className="editor-width">
      <div className="page-intro">
        <h1>My donor profile</h1>
        <p>Your details. Your availability. Your choice.</p>
      </div>
      <ProfileEditor
        profile={{
          name: d.name,
          bloodGroup: d.bloodGroup,
          divisionId: d.divisionId,
          districtId: d.districtId,
          localityId: d.localityId,
          areaId: d.areaId,
          fallbackArea: d.fallbackArea,
          available: d.available,
          visible: d.visible,
          consent: !!d.consentAt,
          hasPhoto: !!d.imageUrl,
          phone: d.phone || "",
          imageUrl: d.imageUrl,
          location: await locationLabel([
            d.divisionId,
            d.districtId,
            d.localityId,
            d.areaId,
          ]),
        }}
      />
      <section className="dashboard-panel">
        <h2>Delete my profile</h2>
        <p>
          Permanently remove your donor profile and sign-in account, including
          your donation history and photo.
        </p>
        <AccountActions showLogout={false} />
      </section>
    </div>
  );
}
