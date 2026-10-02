export const contactLimits = {
  accountHourly: 10,
  ipHourly: 20,
  accountDaily: 25,
  ipDaily: 50,
};
export const approvalLifetime = 24 * 60 * 60 * 1000;
// After a donor declines, the same person may ask again once this has passed.
export const declineCooldown = 24 * 60 * 60 * 1000;
export function contactStatus(
  request: { status: string; expiresAt: Date | null },
  now = new Date(),
) {
  if (request.status === "APPROVED")
    return !request.expiresAt || request.expiresAt <= now
      ? "EXPIRED"
      : request.status;
  // For declined requests expiresAt marks the end of the cooldown.
  if (
    request.status === "DECLINED" &&
    request.expiresAt &&
    request.expiresAt <= now
  )
    return "EXPIRED";
  return request.status;
}
export function approvalValid(
  request: { status: string; expiresAt: Date | null; phoneHash: string | null },
  phoneHash: string,
  now = new Date(),
) {
  return (
    contactStatus(request, now) === "APPROVED" &&
    request.phoneHash === phoneHash
  );
}
