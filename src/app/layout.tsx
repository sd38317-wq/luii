import type { Metadata, Viewport } from "next";
import "./globals.css";

// 가게 이름은 코드에 박지 않고 설정(카페명)에서 가져온다 — 실제 표시 제목은
// 각 페이지(generateMetadata)에서 DB를 읽어 덮어쓰고, 여기는 그 전의 기본값이다.
export const metadata: Metadata = {
  title: "예약관리",
  description: "예약 안내 문자를 자동으로 발송해주는 관리 도구",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "예약관리",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f97316",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
