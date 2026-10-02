import assert from "node:assert/strict";
import { getAuth } from "../lib/auth";
import { db } from "../lib/db";
if (!process.env.DATABASE_URL?.includes("127.0.0.1:55432"))
  throw new Error("Requires isolated database");
const sent: { to: string[]; text: string }[] = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  if (String(input) === "https://api.resend.com/emails") {
    sent.push(JSON.parse(String(init?.body)));
    return Response.json({ id: "test-message" });
  }
  return originalFetch(input, init);
};
async function main() {
  const auth = getAuth();
  const origin = "http://localhost:3002";
  const signup = await auth.api.signUpEmail({
    body: {
      email: "mail-test@example.com",
      name: "Mail Test",
      username: "mail_test",
      password: "isolated-mail-password-42",
    },
    asResponse: true,
  });
  assert.equal(signup.status, 200);
  const user = (await signup.json()).user;
  const headers = new Headers({
    Origin: origin,
    Cookie: signup.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; "),
  });
  await db().user.update({
    where: { id: user.id },
    data: { emailVerified: true },
  });
  const change = await auth.api.changeEmail({
    body: {
      newEmail: "mail-new@example.com",
      callbackURL: "/dashboard/settings",
    },
    headers,
    asResponse: true,
  });
  assert.equal(change.status, 200);
  assert.equal(
    (await db().user.findUniqueOrThrow({ where: { id: user.id } })).email,
    "mail-test@example.com",
  );
  assert.deepEqual(sent[0].to, ["mail-test@example.com"]);
  const link = (text: string) => text.match(/https?:\/\/\S+/)![0];
  await auth.handler(new Request(link(sent[0].text)));
  assert.deepEqual(sent[1].to, ["mail-new@example.com"]);
  assert.equal(
    (await db().user.findUniqueOrThrow({ where: { id: user.id } })).email,
    "mail-test@example.com",
  );
  await auth.handler(new Request(link(sent[1].text)));
  const updated = await db().user.findUniqueOrThrow({ where: { id: user.id } });
  assert.equal(updated.email, "mail-new@example.com");
  assert.equal(updated.emailVerified, true);
  await db().user.delete({ where: { id: user.id } });
  console.log(
    "PASS: mocked Resend delivery, current-address approval, new-address verification, no premature email changes.",
  );
  await db().$disconnect();
}
main().catch(async (e) => {
  console.error(e);
  await db().$disconnect();
  process.exit(1);
});
