import type { MetadataRoute } from "next";
import { getAppTitle } from "@/lib/branding";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const title = await getAppTitle();
  return {
    name: title,
    short_name: title,
    description: "예약 안내 문자를 자동으로 발송해주는 관리 도구",
    start_url: "/admin",
    display: "standalone",
    background_color: "#f9fafb",
    theme_color: "#f97316",
    lang: "ko",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
