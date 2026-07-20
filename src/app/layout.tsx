import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "키즈카페 예약 안내 문자",
  description: "네이버 예약 30분 전 자동 SMS 안내 발송 관리 도구",
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
