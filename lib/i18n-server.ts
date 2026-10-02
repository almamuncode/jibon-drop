import "server-only";
import { cookies } from "next/headers";
import { normalizeLocale, translator } from "./i18n";
export async function getLocale() {
  return normalizeLocale((await cookies()).get("jibondrop-language")?.value);
}
export async function getTranslation() {
  return translator(await getLocale());
}
