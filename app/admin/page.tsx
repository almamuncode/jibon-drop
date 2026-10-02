import Link from "next/link";
import { db } from "@/lib/db";
import { currentAdmin } from "@/lib/admin";
import { notFound } from "next/navigation";
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  if (!(await currentAdmin())) notFound();
  const params = await searchParams;
  const q = (params.q || "").trim().slice(0, 100);
  const page = Math.max(
    1,
    Math.min(100000, Math.floor(Number(params.page)) || 1),
  );
  const where = q
    ? {
        OR: [
          { email: { contains: q, mode: "insensitive" as const } },
          { name: { contains: q, mode: "insensitive" as const } },
          { username: { contains: q, mode: "insensitive" as const } },
          { donor: { phone: { contains: q } } },
        ],
      }
    : {};
  const total = await db().user.count({ where });
  const users = await db().user.findMany({
    where,
    skip: (page - 1) * 20,
    take: 20,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      suspended: true,
      donor: {
        select: { bloodGroup: true, visible: true, moderationBlocked: true },
      },
    },
  });
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">Administration</span>
        <h1>Manage users</h1>
        <p>
          {total} matching accounts. Select a user to view their profile and
          manage access.
        </p>
      </div>
      <form className="dashboard-panel admin-search">
        <label htmlFor="admin-search">
          Search name, email, username or phone
        </label>
        <input id="admin-search" name="q" defaultValue={q} />
        <button className="button">Search</button>
      </form>
      <div className="admin-user-list">
        {users.map((u) => (
          <Link
            className="dashboard-panel admin-user"
            key={u.id}
            href={`/admin/users/${u.id}`}
          >
            <div>
              <strong>{u.name}</strong>
              <p>{u.email}</p>
            </div>
            <span>{u.donor?.bloodGroup || "No blood group"}</span>
            <span className="blood-badge">
              {u.suspended
                ? "Suspended"
                : u.role === "ADMIN"
                  ? "Admin"
                  : u.donor?.moderationBlocked
                    ? "Listing blocked"
                    : u.donor?.visible
                      ? "Public"
                      : "Private"}
            </span>
          </Link>
        ))}
      </div>
      {!users.length && <p>No users found.</p>}
      <div className="admin-pagination">
        {page > 1 && (
          <Link href={`/admin?q=${encodeURIComponent(q)}&page=${page - 1}`}>
            Previous
          </Link>
        )}
        <span>Page {page}</span>
        {page * 20 < total && (
          <Link href={`/admin?q=${encodeURIComponent(q)}&page=${page + 1}`}>
            Next
          </Link>
        )}
      </div>
    </>
  );
}
