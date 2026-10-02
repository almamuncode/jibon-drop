# Mobile platforms

The Next.js app is the shared backend and the installable PWA. The manifest,
home-screen icons, mobile bottom navigation, installation guidance, and offline
fallback are implemented. Service-worker registration is production-only to
keep development assets fresh. Only the static offline page is cached; donor
data, authentication, API responses, and Next.js assets always use the network.

Native Android/iOS applications are not implemented yet. Use a separate
React Native/Expo client rather than bundling this server-rendered Next.js app
or loading the production website through a development WebView URL.

Before integrating the native client:

1. Choose the production backend HTTPS origin.
2. Choose a unique Android application ID and iOS bundle identifier, normally
   in reverse-domain format. These identifiers are configured in the app
   project; they are not Google OAuth client IDs.
3. Expose a versioned public donor-search API using the existing visibility,
   consent, hierarchy validation, pagination, and public-field projection.
4. Implement native authentication with the Better Auth Expo integration,
   secure credential storage, explicit trusted origins, and OAuth callbacks.
   Existing browser session cookies are not a native authentication strategy.
5. Build the donor search, profile, contact, and donation flows for touch,
   including loading, failure, and empty states.
6. Configure native Google OAuth credentials after the app identifiers and
   signing keys exist. Keep OAuth client secrets exclusively on the backend.
7. Test on Android and iOS devices before configuring store signing and release.

The PWA needs HTTPS in deployment. On iOS, install through Safari's Share menu
and Add to Home Screen. Android browsers may offer an install prompt. Offline
mode cannot search donors or perform account mutations.
