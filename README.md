# JibonDrop · জীবনড্রপ

A drop of blood. A gift of life.

Next.js App Router / TypeScript / Tailwind, Prisma 7 with the PostgreSQL driver adapter, Neon-compatible PostgreSQL, Zod, Lucide, and Vercel Blob. No fake donors are seeded. The public directory works without an account; private mutations require an iron-session sealed cookie with an opaque, hashed database session. Phone OTP is delivered through a pluggable server-side adapter.

## Local setup

Use Node 24 LTS and npm. Run `npm ci`, copy `.env.example` to `.env`, and configure a dedicated PostgreSQL database (Neon is supported). Generate AUTH_SECRET with `openssl rand -hex 32`. Never use the placeholder.

```
npm run db:migrate
npm run db:validate
npm run db:seed
npm run dev
```

Location seeding is repeatable, preserves stable source IDs, and never inserts donor accounts. For local testing only, set `SMS_PROVIDER=mock` and `ENABLE_DEV_OTP=true`. Run `npm run dev`; the generated per-request code is visibly shown in the OTP form. Mock mode is rejected in production and is unavailable in test mode. Codes are not logged. No shared code exists. Live OTP and PostgreSQL flows require configured services.

## SMS configuration

The Twilio adapter uses its official Messages REST API. Set SMS_PROVIDER=twilio, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM. Enable permitted Bangladesh delivery and arrange an approved sender with the provider. Trial-account restrictions apply. A successful API acceptance is not a guarantee of handset delivery. Missing credentials or failed provider requests return an error and remove the pending challenge. Add another provider in `lib/sms.ts`; keep credentials server-side and throw on delivery failure.

Codes expire after five minutes, are consumed once, allow five verification attempts and have a 60-second resend cooldown. PostgreSQL advisory locks serialize phone challenges. Persistent phone/IP limits protect send, verification and anonymous contact endpoints. IP extraction trusts Vercel's forwarded header only on Vercel; other production platforms must implement their trusted proxy IP source (the conservative local bucket is shared otherwise). Sessions last 30 days, are HttpOnly / SameSite=Lax, Secure in production, and store only a SHA-256 token hash (the cookie is additionally sealed by iron-session). Same-origin checks protect mutations. AUTH_SECRET HMAC hashes protect OTP and rate-limit identifiers. Database unique constraints enforce canonical phone ownership. A verified replacement phone revokes other sessions.

## Photos

Create a public Vercel Blob store and set BLOB_READ_WRITE_TOKEN. Browser processing creates a center square preview, iteratively resizes/compresses WebP below 100,000 bytes, and supports skipping. Original input limit is 10 MB; SVG and animation are rejected. Authenticated server processing decodes real bytes using Sharp, rejects animation, enforces dimensions/pixels and size, and re-encodes without metadata. Public photos are expressly consented to. Images use unoptimized Next Image to avoid a separate image optimization cache; previously copied public Blob URLs may remain accessible until storage deletion/CDN expiration. Use a private Blob store with an authenticated visibility-checking proxy if immediate revocation of image URLs is a deployment requirement.

Replacement writes the new reference before removing the old object. Account deletion cascades sessions and donations and queues storage cleanup transactionally. Run `node --import tsx scripts/cleanup.ts` regularly using a trusted scheduler with the same environment to retry storage deletion and purge expired authentication/rate records. Do not omit this operational step.

## Location provenance and gaps

See [dataset report](docs/locations.md). Registration and search query the same hierarchical records and lazy-load children. Explicit types support DIVISION, DISTRICT, UPAZILA, THANA, UNION, WARD and AREA. This seed does not pretend its rural upazila/union records cover urban thana/wards. A missing locality/area can be entered privately under the nearest known parent. Free text is never exposed or used as an invented administrative filter.

## Deployment to Vercel

Import this repository as a Next.js project. Add production environment variables. Use a Neon pooled DATABASE_URL; use an appropriate migration connection if your database's pooler does not support DDL. Run migrations and location seed against the intended database before serving traffic; do not run seeds during every build. Build command: `npm run build`. Set Node 24. Configure Twilio and the Blob store, then run a real end-to-end smoke test before public launch. This repository does not deploy automatically.

Remaining external setup: PostgreSQL/Neon credentials and migrations, random AUTH_SECRET, SMS account/sender and Bangladesh permissions, Blob credentials, scheduled cleanup, and urban dataset review. No integration is claimed operational until these are supplied.

## Verification

```
npm run lint
npm run typecheck
npm test
npm run build
```

Tests cover phone normalization, donation date validation, Dhaka boundaries, public projection privacy, consent validation, production mock protection, location import integrity and image decoding. Database integration tests use a separate ephemeral PostgreSQL-compatible runtime, never the live directory. Browser smoke checks cover mobile navigation, form labels and cascading resets. See the implementation report for actual executed results and limits.

Donation count and last date are cached aggregates recomputed transactionally after each owned mutation with a donor-row lock. Submission UUID uniqueness prevents retry duplication. Public reads are dynamic and API responses are no-store. Contact verifies current visibility and consent at reveal time. Public errors exclude underlying database exception details. Availability and donation dates never imply medical eligibility.

UI copy is centralized where shared in `lib/copy.ts`; page-specific English strings are colocated with their page and should be extracted into the same locale catalog when adding Bangla. Fonts fall back to the system's Bengali font. The wordmark is text; no logo asset was created.

### Isolated integration suite

In separate terminals, run `node --import tsx scripts/test-db.ts`, then run the app with DATABASE_URL=`postgresql://postgres:postgres@127.0.0.1:55432/postgres`, a test AUTH_SECRET, SMS_PROVIDER=mock, ENABLE_DEV_OTP=true and `npm run dev`. Then run `node --import tsx scripts/integration.ts`. This script only targets the hardcoded local ephemeral database and localhost app, truncates its fixtures, and requires a Playwright Chromium installation (`npx playwright install chromium`). PLAYWRIGHT_CHROMIUM_PATH can select an existing Chromium binary. Screenshots go to /tmp. Stop the temporary database afterward; no production connection is used.

Official integration references: [Next.js route handlers](https://nextjs.org/docs/app/getting-started/route-handlers), [Prisma Next.js guide](https://www.prisma.io/docs/guides/frameworks/nextjs), [Vercel Blob SDK](https://vercel.com/docs/vercel-blob/using-blob-sdk), [Twilio Messages API](https://www.twilio.com/docs/messaging/api/message-resource), [iron-session](https://github.com/vvo/iron-session), [libphonenumber-js](https://github.com/catamphetamine/libphonenumber-js). Stable dependency versions and lockfile are included; Prisma 8 release candidates were not adopted. Overrides patch development-only transitive deepmerge-ts and mysql2 advisories.
