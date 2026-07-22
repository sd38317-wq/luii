import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "바른프라이빗키즈룸 _ 괴정점 예약관리",
  description: "네이버 예약 30분 전 자동 SMS 안내 발송 관리 도구",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "괴정점 예약관리",
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
