import { dateLabel } from "@/lib/format";
import { getLocale, getTranslation } from "@/lib/i18n-server";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { SearchForm } from "@/components/search";
import { Avatar, Notice } from "@/components/ui";
import { Contact } from "@/components/contact";
import { db } from "@/lib/db";
import { published, publicSelect, validateHierarchy } from "@/lib/public";
import { bloodGroups } from "@/lib/validation";
export const dynamic = "force-dynamic";
async function loadSearch(f: Record<string, string>) {
  const t = await getTranslation();
  const locale = await getLocale();

  try {
    if (!bloodGroups.includes(f.bloodGroup as (typeof bloodGroups)[number]))
      throw new Error(t("Choose a supported blood group."));
    if (f.divisionId)
      await validateHierarchy({
        divisionId: f.divisionId,
        districtId: f.districtId || null,
        localityId: f.localityId || null,
        areaId: f.areaId || null,
      });
    else if (f.districtId || f.localityId || f.areaId)
      throw new Error(t("Choose parent locations first."));
    const where: Prisma.DonorWhereInput = {
      ...published,
      bloodGroup: f.bloodGroup,
      ...(f.available === "true" ? { available: true } : {}),
    };
    for (const key of [
      "divisionId",
      "districtId",
      "localityId",
      "areaId",
    ] as const)
      if (f[key]) where[key] = f[key];
    const page = Math.min(10000, Math.max(1, Math.floor(Number(f.page)) || 1));
    const [total, donors] = await Promise.all([
      db().donor.count({ where }),
      db().donor.findMany({
        where,
        select: publicSelect,
        take: 12,
        skip: (page - 1) * 12,
        orderBy:
          f.sort === "donations"
            ? [{ donationCount: "desc" }, { publicId: "asc" }]
            : f.sort === "updated"
              ? [{ updatedAt: "desc" }, { publicId: "asc" }]
              : [
                  { available: "desc" },
                  { updatedAt: "desc" },
                  { publicId: "asc" },
                ],
      }),
    ]);
    const ids = [
      ...new Set(
        donors
          .flatMap((d) => [d.divisionId, d.districtId, d.localityId, d.areaId])
          .filter((x): x is string => !!x),
      ),
    ];
    const locations = await db().location.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, bnName: true },
    });
    return { total, donors, locations, page, error: null };
  } catch (e) {
    return {
      error: (e as Error).message,
      total: 0,
      donors: [],
      locations: [],
      page: 1,
    };
  }
}
export default async function Finder({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslation();
  const locale = await getLocale();

  const raw = await searchParams;
  const f = Object.fromEntries(
    Object.entries(raw).filter(
      (v): v is [string, string] => typeof v[1] === "string",
    ),
  );
  const { total, donors, locations, page, error } = f.bloodGroup
    ? await loadSearch(f)
    : { total: 0, donors: [], locations: [], page: 1, error: null };
  function pageHref(p: number) {
    return "/find-donors?" + new URLSearchParams({ ...f, page: String(p) });
  }
  const result = !f.bloodGroup ? (
    <Notice>
      {t(
        "Choose a blood group to start your search. You can search all locations.",
      )}{" "}
    </Notice>
  ) : error ? (
    <Notice>{t.error(error)}</Notice>
  ) : (
    <>
      <div className="results-heading">
        <h2>
          {locale === "bn"
            ? `${total.toLocaleString("bn-BD")} জন রক্তদাতা`
            : `${total} matching donor${total === 1 ? "" : "s"}`}
        </h2>
        <span className="muted">
          {f.bloodGroup} {t("· self-reported information")}{" "}
        </span>
      </div>
      {!donors.length ? (
        <div className="empty">
          <h3>{t("No donors match these filters.")}</h3>
          <p>
            {t(
              "Try removing a location filter, or include temporarily unavailable donors.",
            )}{" "}
          </p>
          {["areaId", "localityId", "districtId", "divisionId", "available"]
            .filter((k) => f[k])
            .map((key) => {
              const next = { ...f };
              delete next.page;
              const hierarchy = [
                "divisionId",
                "districtId",
                "localityId",
                "areaId",
              ];
              const idx = hierarchy.indexOf(key);
              if (idx >= 0) hierarchy.slice(idx).forEach((k) => delete next[k]);
              else delete next[key];
              return (
                <Link
                  className="button secondary"
                  key={key}
                  href={"/find-donors?" + new URLSearchParams(next)}
                >
                  {t(
                    (
                      {
                        areaId: "Remove area filter",
                        localityId: "Remove upazila / thana filter",
                        districtId: "Remove district filter",
                        divisionId: "Remove division filter",
                        available: "Remove availability filter",
                      } as Record<string, string>
                    )[key],
                  )}
                </Link>
              );
            })}
        </div>
      ) : (
        <div className="donor-grid">
          {donors.map((d) => (
            <article className="donor-card" key={d.publicId}>
              <div className="card-top">
                <Avatar name={d.name} url={d.imageUrl} />
                <span className="blood-badge">{d.bloodGroup}</span>
              </div>
              <h3>{d.name}</h3>
              <p className="muted">
                {[d.localityId, d.districtId, d.divisionId]
                  .map((id) => {
                    const location = locations.find((l) => l.id === id);
                    return locale === "bn"
                      ? location?.bnName || location?.name
                      : location?.name;
                  })
                  .filter(Boolean)
                  .join(", ")}
              </p>
              <span className={"status " + (!d.available ? "unavailable" : "")}>
                {d.available ? t("Available") : t("Temporarily unavailable")}
              </span>
              <dl>
                <div>
                  <dt>{t("Donations recorded")}</dt>
                  <dd>{d.donationCount}</dd>
                </div>
                <div>
                  <dt>{t("Last donation")}</dt>
                  <dd>{dateLabel(d.lastDonation, locale)}</dd>
                </div>
              </dl>
              <Link className="text-link" href={"/donors/" + d.publicId}>
                {t("View profile →")}{" "}
              </Link>
              <Contact publicId={d.publicId} />
            </article>
          ))}
        </div>
      )}
      <nav className="pagination" aria-label={t("Search pages")}>
        {page > 1 && (
          <Link className="button secondary" href={pageHref(page - 1)}>
            {t("Previous")}{" "}
          </Link>
        )}
        <span>
          {t("Page")} {page}
        </span>
        {page * 12 < total && (
          <Link className="button secondary" href={pageHref(page + 1)}>
            {t("Next")}{" "}
          </Link>
        )}
      </nav>
    </>
  );
  return (
    <div className="container">
      <div className="page-intro">
        <span className="eyebrow">{t("Here when you need a connection")}</span>
        <h1>{t("Find blood donors")}</h1>
        <p>{t("Search freely. Reach out respectfully.")}</p>
      </div>
      <div className="finder-layout">
        <aside>
          <SearchForm filters={f} />
        </aside>
        <section aria-label={t("Search results")}>
          {result}
          <p className="muted">
            {t(
              "Availability is donor-reported willingness, not medical clearance. Donation records are self-reported; missing records do not mean someone has never donated.",
            )}{" "}
          </p>
        </section>
      </div>
    </div>
  );
}
