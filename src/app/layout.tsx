import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bloxtools | Roblox Dashboard & Webhook Manager",
  description:
    "Bloxtools là dashboard giúp bạn quản lý webhook, xem thống kê và tự động hoá các tác vụ Roblox trong một giao diện hiện đại.",
  metadataBase: new URL("https://bloxtools.info/"),
  icons: {
    icon: "/favicon-does-not-exist.ico",
  },
  openGraph: {
    title: "Bloxtools | Roblox Dashboard & Webhook Manager",
    description:
      "Quản lý webhook và các tác vụ Roblox với Bloxtools – giao diện đẹp, dễ dùng, tối ưu cho desktop & mobile.",
    url: "https://bloxtools.info/",
    siteName: "Bloxtools",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bloxtools | Roblox Dashboard & Webhook Manager",
    description:
      "Bloxtools giúp bạn quản lý webhook và các tác vụ Roblox một cách trực quan trong trình duyệt.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
