import { mockEnabled } from "./validation";
export async function sendOtp(phone: string, code: string) {
  if (mockEnabled()) return { devCode: code };
  if (
    process.env.SMS_PROVIDER !== "twilio" ||
    !process.env.TWILIO_ACCOUNT_SID ||
    !process.env.TWILIO_AUTH_TOKEN ||
    !process.env.TWILIO_FROM
  )
    throw new Error(
      "SMS is not configured. Configure a production SMS provider.",
    );
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(
            `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`,
          ).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: phone,
        From: process.env.TWILIO_FROM,
        Body: `Your JibonDrop code is ${code}. It expires in 5 minutes.`,
      }),
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!response.ok) throw new Error("SMS delivery failed. Please try later.");
  return {};
}
