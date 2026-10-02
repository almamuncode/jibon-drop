import { beforeEach, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  upsert: vi.fn(),
  findUnique: vi.fn(),
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: "session=test" }),
}));
vi.mock("../lib/auth", () => ({
  getAuth: () => ({
    api: {
      getSession: async () => ({ user: { id: "user-1", name: "Donor" } }),
    },
  }),
}));
vi.mock("../lib/db", () => ({
  db: () => ({
    user: { findUnique: async () => ({ suspended: false }) },
    donor: mocks,
  }),
}));
import { currentDonor } from "../lib/security";

beforeEach(() => vi.resetAllMocks());

it("recovers the same user's donor after concurrent profile creation", async () => {
  mocks.upsert.mockRejectedValue(
    new Prisma.PrismaClientKnownRequestError("Unique constraint", {
      code: "P2002",
      clientVersion: "test",
    }),
  );
  const donor = { id: "donor-1", userId: "user-1" };
  mocks.findUnique.mockResolvedValue(donor);
  expect(await currentDonor()).toEqual(donor);
  expect(mocks.findUnique).toHaveBeenCalledWith({
    where: { userId: "user-1" },
  });
});

it("does not hide other database failures", async () => {
  const error = new Error("Database unavailable");
  mocks.upsert.mockRejectedValue(error);
  await expect(currentDonor()).rejects.toBe(error);
  expect(mocks.findUnique).not.toHaveBeenCalled();
});
