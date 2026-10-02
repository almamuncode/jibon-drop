export const contactLimits = {
  accountHourly: 10,
  ipHourly: 20,
  accountDaily: 25,
  ipDaily: 50,
};
export const approvalLifetime = 24 * 60 * 60 * 1000;
export function contactStatus(
  request: { status: string; expiresAt: Date | null },
  now = new Date(),
) {
  return request.status === "APPROVED" &&
    (!request.expiresAt || request.expiresAt <= now)
    ? "EXPIRED"
    : request.status;
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
