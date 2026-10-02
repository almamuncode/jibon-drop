# Current authentication verification

Authentication now uses Better Auth with Google or email/username and password. The earlier OTP test report is superseded.

Verified against an isolated PostgreSQL-compatible PGlite database and actual HTTP handlers: registration, duplicate email/username rejection, non-plaintext password storage, email login, case-insensitive username login, wrong password rejection, account/IP persistent throttling, authenticated donor profile editing, invalid location hierarchy rejection, contact phone normalization without claiming verification, private identity projection, donation ownership/idempotency and aggregate add/edit/delete, hidden profile 404, contact consent withdrawal, logout and account deletion revoking all sessions and credentials.

Playwright mobile browser verification covered manual registration, donor profile completion, username login and horizontal layout bounds at 390px. Unit tests cover registration schema normalization/password limits, phone normalization, location imports, donation calendar dates and image decoding. No fake donor was seeded into the configured database.

Real Google OAuth callback and live Vercel Blob delivery/cleanup still need credentials and an external service smoke test. Google sign-in is visibly disabled until configured. Password recovery email delivery is not configured or advertised. Manual email ownership is not verified; Google/password auto-linking and email changes are disabled. Contact numbers are self-reported. Legacy donor data is preserved by the migration and cannot be claimed just by typing its number.
