import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "JibonDrop — Blood donors in Bangladesh",
    short_name: "JibonDrop",
    description: "Find blood donors near you and join the donor community.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f5f5",
    theme_color: "#df0715",
    lang: "en",
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
