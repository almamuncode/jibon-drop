# JibonDrop · জীবনড্রপ

A drop of blood. A gift of life.

A Next.js / TypeScript donor directory with PostgreSQL (Neon-compatible), Prisma, Tailwind, Better Auth, Zod and Vercel Blob. Public search requires no account. Contact requests and phone-number access require login and donor approval. Donors sign in using **Google**, or **email/username and password**. SMS is no longer used.

## Local setup

Use Node 24 LTS. Run `npm ci`, copy `.env.example` to `.env` if it does not exist, and set DATABASE_URL to your PostgreSQL connection string. Generate AUTH_SECRET with `openssl rand -hex 32`. Keep secrets out of Git. Set BETTER_AUTH_URL to `http://localhost:3000` (or the actual local port).

```
npm run db:migrate
npm run db:validate
npm run db:seed
npm run dev
```

The location seed is repeatable and inserts no donors. No SMS provider or SMS credentials are needed. Manual registration collects name, email, username and password. Usernames are case-insensitive, 3–30 letters/numbers/underscores; passwords are 10–128 characters and hashed by Better Auth using its maintained password implementation. Login accepts email or username. Mobile number is entered separately in the donor profile and normalized to Bangladesh E.164 format; without SMS it is **self-reported, not verified**. Profiles remain hidden until location, blood group, contact number and sharing consent are saved.

## Google sign-in setup

1. Create/select a project in Google Cloud Console.
2. Configure Google Auth Platform branding, audience and the basic email/profile scopes. While in Testing, add permitted test users.
3. Create an OAuth client of type **Web application**.
4. Add `http://localhost:3000` as an authorized JavaScript origin and `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI. Use your actual port if different.
5. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in `.env` and restart the server.
6. For production, add the HTTPS website origin and `https://YOUR-DOMAIN/api/auth/callback/google`, and set BETTER_AUTH_URL to that HTTPS origin.

Google sign-in is disabled visibly when credentials are missing. No fake successful OAuth path exists. The Google avatar is not automatically published as a donor photo; donors choose their public photo separately. Users registered with a password must use that login method: automatic Google/password account linking is disabled to prevent takeover of unverified manual email accounts. Google-only accounts use Google login and do not have a local password by default.

Manual registration does not require email verification. Settings supports password changes with the current password and revokes other sessions. To enable verified email changes, set `RESEND_API_KEY` and `EMAIL_FROM` (a sender on your verified Resend domain), then restart locally or redeploy. Email changes only take effect after verification; verified accounts also approve the change from their current address. Password recovery remains disabled. Users can continue using their registered password or Google as appropriate. Direct library deletion/recovery/linking endpoints are blocked so they cannot bypass donor data cleanup or create unverified account takeover paths.

## Migration from phone OTP

The incremental migration adds User/Account/Verification tables, replaces the session shape and revokes old OTP sessions. Existing donor profiles and donations are preserved. Old phone-only profiles have no safely known email identity, so they are hidden until an administrator can independently verify ownership and link Donor.userId to a new User. Never link an existing donor solely because a new account types the same phone number. Existing unclaimed phone numbers remain reserved by the unique constraint. Do not invent emails or passwords for old accounts. If this is an empty installation, no legacy linking is needed.

SMS_PROVIDER, ENABLE_DEV_OTP and TWILIO_* variables may be removed. The application ignores them. The old OTP endpoints are no longer supported. Keep AUTH_SECRET, DATABASE_URL and BLOB_READ_WRITE_TOKEN; add BETTER_AUTH_URL and optional Google credentials.

## Security and privacy

Better Auth handles Google OAuth/state/PKCE, password hashing and HttpOnly session cookies (Secure in production, SameSite protections). Sessions persist in PostgreSQL and expire after 30 days. Authorization uses current database sessions; no client claims or cached session can authorize donor mutations. Persistent HMAC-keyed PostgreSQL limits protect login by account/IP and contact requests/reveals. Vercel IP extraction trusts its platform header; on other platforms implement a trusted proxy IP source (otherwise the conservative shared local bucket applies). Same-origin checks protect donor mutations. Set APP_ORIGIN to a fixed origin if needed.

Email, username, auth accounts and passwords are never in the public donor projection. Numbers are revealed only to the approved requester after checking current consent, visibility, phone-sharing settings, phone identity, approval expiration and contact limits. Availability and donation records are self-reported; they do not establish medical clearance. Donation totals are recomputed transactionally from owned records; dates are calendar dates and displayed in Asia/Dhaka.

## Photos and cleanup

Create a **public** Vercel Blob store and set BLOB_READ_WRITE_TOKEN. Browser preprocessing accepts static JPEG/PNG/WebP up to 10 MB and creates a centered square preview iteratively compressed under 100,000 bytes. Server Sharp decoding enforces real bytes, dimensions/pixels, static format and final size, strips metadata and re-encodes WebP. SVG/animation/disguised files are rejected. Skipping a photo uses initials.

Replacement updates the database before removing the previous image. Account deletion cascades User sessions/accounts and donor/donation records, and queues Blob deletion transactionally. Run `node --import tsx scripts/cleanup.ts` regularly with a trusted scheduler and the same environment. Failed image cleanup is retained for retry. Previously copied public image URLs may persist until Blob deletion/CDN expiry; use private storage with a visibility-checking proxy if immediate image URL revocation is required.

## Locations

See [location provenance and gaps](docs/locations.md). Imported snapshot: 8 divisions, 64 districts, 494 upazilas, 4,540 unions. Urban thana/wards and current nationwide completeness are unverified. Stable namespaced IDs, linked parent records, English/Bangla names and attribution are retained. Missing areas use private free text under the known parent; administrative records are not invented. Registration and search share lazy-loaded location records.

## Verification

```
npm run lint
npm run typecheck
npm test
npm run build
```

For isolated integration testing, run `node --import tsx scripts/test-db.ts` in one terminal. In another, run the application on port 3002 with DATABASE_URL=`postgresql://postgres:postgres@127.0.0.1:55432/postgres`, a test AUTH_SECRET, BETTER_AUTH_URL=`http://localhost:3002`, APP_ORIGIN=`http://localhost:3002`, JIBONDROP_TEST_BUILD=1 and `npm run dev -- --webpack --port 3002`. Then run `node --import tsx scripts/integration.ts`. Install Playwright Chromium (`npx playwright install chromium`) or set PLAYWRIGHT_CHROMIUM_PATH to an existing Chromium executable. Fixtures are created/truncated only in the hardcoded isolated local database. No fake donors enter the real seed. JIBONDROP_TEST_BUILD separates test build files from your working dev cache.

## Vercel deployment

Configure DATABASE_URL, AUTH_SECRET, BETTER_AUTH_URL, GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET (if enabling Google), and BLOB_READ_WRITE_TOKEN. Use a Neon pooled URL for application traffic and an appropriate direct migration connection for schema changes. Apply migrations and seed before serving traffic. Use Node 24 and `npm run build`; do not seed in every build. Add the production Google redirect URI. Run actual Neon/Google/Blob smoke checks before launch. This task does not deploy publicly.

Remaining external setup: database migrations/credentials, Google OAuth registration, optional Blob configuration, scheduled cleanup. Google OAuth was implemented but needs real credentials to verify a live Google callback. Manual sign-up/login has no SMS charge. The interface defaults to English. The BN/EN switch beside the theme control saves the selected language for one year in a SameSite cookie. Pages, forms, navigation, dates and location labels use the selected language; names and other user-entered content are preserved. Shared translations are in `lib/translations.ts`. Run `node --import tsx scripts/i18n-integration.ts` against the isolated test app to verify switching, persistence and Bangla registration/profile editing.

References: [Better Auth Next.js](https://better-auth.com/docs/integrations/next), [Google](https://better-auth.com/docs/authentication/google), [email/password](https://better-auth.com/docs/authentication/email-password), [username plugin](https://better-auth.com/docs/plugins/username).

## Donor notifications

When a signed-in person sends a contact request, the donor gets an in-app notification (unread badge in the account menu, mobile navigation, dashboard tabs and the requests screen) and an email through Resend. The email contains only a generic message and a link to `BETTER_AUTH_URL/dashboard/requests?request=<id>`; it never includes the message, requester, phone number or patient details. Opening that link marks the notification read. Counts refresh every 45 seconds while the page is visible and pause when it is hidden. No SMS or push is used.

The request is saved even if email fails. Delivery status (`PENDING`, `SENT`, `FAILED`, `SKIPPED`), attempts and the next retry time are stored in `Notification`. Each request has one notification row, delivery is claimed atomically (no duplicate emails), failures retry with backoff (5 min, 20 min, … up to 5 attempts), and a donor receives at most 5 notification emails per hour (extra ones stay in-app as `SKIPPED`). Contact requests keep their existing per-account/IP rate limits.

Setup:

1. Run `npm run db:migrate` (adds the `Notification` table).
2. Set `RESEND_API_KEY`, `EMAIL_FROM`, `BETTER_AUTH_URL` and `CRON_SECRET` (16+ random characters).
3. [vercel.json](vercel.json) schedules `GET /api/cron/notifications` once a day (`0 3 * * *`), the most frequent schedule Vercel Hobby allows; a more frequent expression fails the deployment there. Vercel sends `Authorization: Bearer $CRON_SECRET` automatically. On Pro you can use e.g. `*/15 * * * *`. The endpoint rejects requests without the secret. Failed emails are also attempted once right after the request, so the daily run only catches leftovers.

Notifications emails fail (and are retried) while Resend is not configured. Run `npm test` for authorization, unread-count, email-failure and duplicate-prevention tests (they use an in-memory PGlite database and a mocked mailer, so no real email is sent).

A declined request can be sent again by the same person 24 hours after the decline (`declineCooldown` in `lib/contact-policy.ts`); revoked requests (including admin/abuse revocations) stay closed. Run `npm run db:migrate` to backfill existing declines.

## Administration

Apply migrations (`npm run db:migrate`) before starting the updated app. Register your own account, then grant its admin role from a trusted terminal:

```sh
npm run admin:grant -- your-account@example.com
```

Open `/admin` or choose Administration in the avatar menu. Administrators can search accounts, inspect donor details and recent donation records, block/restore listings, suspend/reactivate accounts, grant/remove admin roles, and remove incorrect donation records. Every change requires a reason and is recorded in `/admin/audit`. Suspension revokes all sessions and prevents new sign-ins. Listing blocks remain effective even if the donor edits their visibility. Restoring a listing does not override the donor’s consent or privacy choices. Administrators cannot suspend themselves or remove their own role. Password hashes, session tokens and OAuth credentials are never displayed.

## Donor phone privacy

Apply `npm run db:migrate` before deploying the contact-privacy update; it adds `ContactRequest`, `AbuseReport`, and `Donor.sharePhone` without changing existing phone numbers. Search remains public. A signed-in visitor sends a 10–500 character request. Donors review requests at `/dashboard/requests`; pending counts appear in the account menu and dashboard. Approvals last 24 hours and authorize only that requester. Phone sharing can be disabled while keeping the directory listing visible. Hiding the profile, withdrawing consent, changing the phone, disabling sharing, moderation blocks, or suspension revoke existing approvals. Declined/revoked requests cannot be repeatedly resubmitted; expired approvals can be requested again.

Contact requests and reveals share persistent caps: 10/hour and 25 per 24 hours per account; 20/hour and 50 per 24 hours per IP. On Vercel the platform IP header is used; other hosts use the shared local bucket until a trusted proxy source is configured. Request status reads do not disclose phone numbers. Approvals cannot erase a number someone has already seen or copied.

Both parties can report abuse associated with their request; reporting revokes contact access. Admins review open reports at `/admin/reports`, manage the reported account, and resolve reports with an audited reason. Reports are limited to 5/account and 20/IP per 24 hours. Notifications are shown inside the dashboard, not sent by email. Run `AUTH_SECRET=<isolated-app-secret> node --import tsx scripts/contact-integration.ts` against the isolated local app/database for authorization, expiry, revocation, limit, reporting and Bangla browser checks.
