import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "키즈카페 예약 안내 문자",
    short_name: "예약안내문자",
    description: "네이버 예약 30분 전 자동 SMS 안내 발송 관리 도구",
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
