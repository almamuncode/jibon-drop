import { describe, expect, it } from "vitest";
import {
  approvalLifetime,
  approvalValid,
  contactLimits,
  contactStatus,
} from "../lib/contact-policy";
const now = new Date("2026-10-03T10:00:00Z");
const grant = {
  status: "APPROVED",
  expiresAt: new Date(now.getTime() + approvalLifetime),
  phoneHash: "current-phone",
};
describe("contact approvals", () => {
  it("requires an unexpired approval for the current phone", () => {
    expect(approvalValid(grant, "current-phone", now)).toBe(true);
    expect(approvalValid(grant, "changed-phone", now)).toBe(false);
    expect(
      approvalValid({ ...grant, status: "REVOKED" }, "current-phone", now),
    ).toBe(false);
    expect(
      approvalValid({ ...grant, status: "PENDING" }, "current-phone", now),
    ).toBe(false);
  });
  it("expires at the boundary and never accepts a missing expiration", () => {
    expect(contactStatus(grant, grant.expiresAt)).toBe("EXPIRED");
    expect(approvalValid(grant, "current-phone", grant.expiresAt)).toBe(false);
    expect(
      approvalValid({ ...grant, expiresAt: null }, "current-phone", now),
    ).toBe(false);
    expect(contactStatus({ status: "DECLINED", expiresAt: null }, now)).toBe(
      "DECLINED",
    );
  });
  it("sets account and IP daily caps as well as hourly caps", () => {
    expect(contactLimits).toEqual({
      accountHourly: 10,
      ipHourly: 20,
      accountDaily: 25,
      ipDaily: 50,
    });
    expect(approvalLifetime).toBe(86400000);
  });
});
