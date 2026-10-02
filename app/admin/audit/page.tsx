import { db } from "@/lib/db";
import { currentAdmin } from "@/lib/admin";
import { notFound } from "next/navigation";
export default async function AuditPage() {
  if (!(await currentAdmin())) notFound();
  const events = await db().adminAudit.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const users = await db().user.findMany({
    where: {
      id: { in: [...new Set(events.flatMap((e) => [e.actorId, e.targetId]))] },
    },
    select: { id: true, email: true },
  });
  const label = (id: string) => users.find((u) => u.id === id)?.email || id;
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">Administration</span>
        <h1>Activity log</h1>
        <p>The latest 100 administrative changes.</p>
      </div>
      {events.map((e) => (
        <article className="dashboard-panel" key={e.id}>
          <strong>{e.action}</strong>
          <p>
            {label(e.actorId)} → {label(e.targetId)}
          </p>
          <p>{e.reason}</p>
          <small>{e.createdAt.toISOString()}</small>
        </article>
      ))}
      {!events.length && <p>No administrative changes yet.</p>}
    </>
  );
}
