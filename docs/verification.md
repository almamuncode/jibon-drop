# Current authentication verification

Authentication now uses Better Auth with Google or email/username and password. The earlier OTP test report is superseded.

Verified against an isolated PostgreSQL-compatible PGlite database and actual HTTP handlers: registration, duplicate email/username rejection, non-plaintext password storage, email login, case-insensitive username login, wrong password rejection, account/IP persistent throttling, authenticated donor profile editing, invalid location hierarchy rejection, contact phone normalization without claiming verification, private identity projection, donation ownership/idempotency and aggregate add/edit/delete, hidden profile 404, contact consent withdrawal, logout and account deletion revoking all sessions and credentials.

Playwright mobile browser verification covered manual registration, donor profile completion, username login and horizontal layout bounds at 390px. Unit tests cover registration schema normalization/password limits, phone normalization, location imports, donation calendar dates and image decoding. No fake donor was seeded into the configured database.

Real Google OAuth callback and live Vercel Blob delivery/cleanup still need credentials and an external service smoke test. Google sign-in is visibly disabled until configured. Password recovery email delivery is not configured or advertised. Manual email ownership is not verified; Google/password auto-linking and email changes are disabled. Contact numbers are self-reported. Legacy donor data is preserved by the migration and cannot be claimed just by typing its number.

## Bangla and English interface

The interface defaults to English and stores the selected BN/EN language in a one-year SameSite cookie. Server-rendered copy and client forms receive the same locale. Locations show one name in the selected language; dates use bn-BD or en-GB with the Asia/Dhaka timezone. User-entered names and notes remain unchanged.

Verified an optimized production build against the isolated PGlite database with Playwright: default Bangla, switching in both directions, persistence across navigation/reload, Bangla registration and profile saving, single-language location options, deletion confirmation spacing, 390px and 320px mobile layout bounds, and admin views in both languages. Existing auth/profile and admin integration checks also passed. Unit tests cover locale fallback, translation preservation, errors and date formatting. No production data was used.

## Donor-approved contact privacy

Public search remains available without login. Contact requests and number reveals require an active account. Isolated API/browser checks verified request ownership, pending-request privacy, approval restricted to its requester, 24-hour expiry, decline protection, disabling sharing while preserving the listing, phone-change/visibility/consent revocation, moderation and suspension revocation, account/IP hourly and daily limits, pair-authorized abuse reports, report-triggered revocation, admin resolution with an audit entry, and cascading deletion. The Bangla browser flow covered sending a request, donor approval, number reveal, and revocation followed by a fresh page that no longer exposes the number. Unit tests verify expiry boundaries and phone-identity matching. The test pool uses one connection because PGlite's socket fixture shares a PostgreSQL backend; production pool settings remain unchanged.

Before deploying, apply the `20261003010000_contact_privacy` migration with `npm run db:migrate`. Notifications are dashboard notices/menu counts. Revocation prevents future disclosures; it cannot erase a previously seen/copied number. No production database or real donor was used for verification.
