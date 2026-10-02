import { requireDonor } from "@/lib/security";
import { ProfileEditor } from "@/components/profile-editor";
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
          phone: d.phone,
        }}
      />
    </div>
  );
}
