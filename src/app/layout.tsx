import type { Metadata } from "next";
import { Be_Vietnam_Pro, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import AnalyticsTracker from "@/components/AnalyticsTracker";

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Visa Auto Tracking | Theo dõi Tiến trình Hồ sơ Định cư Mỹ",
  description: "Hệ thống tự động tra cứu, theo dõi tiến trình hồ sơ Visa và nhận thông báo email tự động khi có lịch Visa Bulletin mới hàng tháng.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${beVietnamPro.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-pale-slate text-foreground selection:bg-electric-blue selection:text-white">
        <AnalyticsTracker />
        {children}
      </body>
    </html>
  );
}

