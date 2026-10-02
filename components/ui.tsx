import Link from "next/link";
import Image from "next/image";
export function Avatar({ name, url }: { name: string; url: string | null }) {
  return (
    <div className="avatar">
      {url ? (
        <Image src={url} alt={name} width={72} height={72} unoptimized />
      ) : (
        name
          .split(" ")
          .slice(0, 2)
          .map((x) => x[0])
          .join("")
          .toUpperCase()
      )}
    </div>
  );
}
export function Notice({ children }: { children: React.ReactNode }) {
  return <div className="notice">{children}</div>;
}
export function DashboardNav() {
  return (
    <nav className="tabs" aria-label="Dashboard">
      <Link href="/dashboard">Overview</Link>
      <Link href="/dashboard/profile">My profile</Link>
      <Link href="/dashboard/donations">Donation records</Link>
    </nav>
  );
}
export const dateLabel = (value: Date | string | null) =>
  value
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Dhaka",
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "Not recorded";
