import Image from "next/image";
import type { Metadata } from "next";
import { getTranslation } from "@/lib/i18n-server";
const members = [
  {
    name: "Al Mamun",
    role: "Full Stack Web Developer",
    photo: "/team/al-mamun.jpg",
  },
];
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslation();
  return { title: t("Team") };
}
export default async function TeamPage() {
  const t = await getTranslation();
  return (
    <div className="container team-page">
      <div className="page-intro">
        <span className="eyebrow">JibonDrop</span>
        <h1>{t("Meet our team")}</h1>
        <p>
          {t("The people building JibonDrop and connecting our community.")}
        </p>
      </div>
      <div className="team-grid">
        {members.map((member) => (
          <article className="team-member-card" key={member.name}>
            <Image
              src={member.photo}
              alt={member.name}
              width={400}
              height={400}
              sizes="(max-width: 640px) calc(100vw - 64px), 320px"
            />
            <div>
              <h2>{member.name}</h2>
              <p>{t(member.role)}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
