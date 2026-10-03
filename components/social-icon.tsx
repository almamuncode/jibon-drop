export function SocialIcon({
  platform,
}: {
  platform: "Facebook" | "Instagram" | "YouTube" | "LinkedIn";
}) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {platform === "Facebook" && (
        <path
          fill="currentColor"
          stroke="none"
          d="M14 22v-9h3l.5-4H14V7c0-1.2.4-2 2-2h2V1.5C17 1.2 16 1 15 1c-3 0-5 2-5 5v3H7v4h3v9Z"
        />
      )}
      {platform === "Instagram" && (
        <>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r=".5" fill="currentColor" />
        </>
      )}
      {platform === "YouTube" && (
        <>
          <rect x="2" y="5" width="20" height="14" rx="4" />
          <path d="m10 9 5 3-5 3Z" />
        </>
      )}
      {platform === "LinkedIn" && (
        <>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M7 10v7m4 0v-7m0 3c0-4 6-4 6 0v4" />
          <circle cx="7" cy="7" r=".5" fill="currentColor" />
        </>
      )}
    </svg>
  );
}
