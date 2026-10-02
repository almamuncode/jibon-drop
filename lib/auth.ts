import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { username } from "better-auth/plugins";
import { db } from "./db";
import { emailConfigured, sendAccountEmail } from "./email";
export function googleConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}
function createAuth() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("Set AUTH_SECRET to at least 32 random characters.");
  const baseURL =
    process.env.BETTER_AUTH_URL ||
    process.env.APP_ORIGIN ||
    (process.env.NODE_ENV !== "production"
      ? "http://localhost:3000"
      : undefined);
  if (!baseURL)
    throw new Error("Set BETTER_AUTH_URL to your production website origin.");
  return betterAuth({
    logger: { disabled: true },
    secret,
    baseURL,
    database: prismaAdapter(db(), { provider: "postgresql" }),
    user: {
      changeEmail: {
        enabled: emailConfigured(),
        sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
          await sendAccountEmail(
            user.email,
            "Approve your JibonDrop email change",
            `An email change to ${newEmail} was requested for your JibonDrop account.\n\nApprove this change: ${url}\n\nIf you did not request this, ignore this email.`,
          );
        },
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        await sendAccountEmail(
          user.email,
          "Verify your JibonDrop email",
          `Verify this email address for your JibonDrop account:\n\n${url}\n\nIf you did not request this, ignore this email.`,
        );
      },
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
    },
    socialProviders: googleConfigured()
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            prompt: "select_account",
          },
        }
      : {},
    account: { accountLinking: { enabled: false } },
    session: { expiresIn: 30 * 86400, cookieCache: { enabled: false } },
    plugins: [
      username({
        minUsernameLength: 3,
        maxUsernameLength: 30,
        usernameValidator: (value) => /^[a-zA-Z0-9_]+$/.test(value),
      }),
    ],
    advanced: { useSecureCookies: process.env.NODE_ENV === "production" },
  });
}

let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() {
  return (instance ??= createAuth());
}
