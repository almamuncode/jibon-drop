import { getLocale } from "@/lib/i18n-server";
import type { MetadataRoute } from "next";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const locale = await getLocale();
  return {
    id: "/",
    name:
      locale === "bn"
        ? "জীবনড্রপ — বাংলাদেশে রক্তদাতা"
        : "JibonDrop — Blood donors in Bangladesh",
    short_name: locale === "bn" ? "জীবনড্রপ" : "JibonDrop",
    description:
      locale === "bn"
        ? "কাছের রক্তদাতা খুঁজুন এবং রক্তদাতাদের সঙ্গে যুক্ত হোন।"
        : "Find blood donors near you and join the donor community.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f5f5",
    theme_color: "#df0715",
    lang: locale,
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
