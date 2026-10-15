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
  title: "Meal Planner",
  description: "Meal Planner: plan weekly meals, dishes and prep reminders",
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
  themeColor: "#f8faf8",
  other: {
    "color-scheme": "light only",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" style={{ colorScheme: 'light' }}>
      <head>
        <meta name="color-scheme" content="light only" />
        <meta name="theme-color" content="#f8faf8" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#f8faf8]`}
        suppressHydrationWarning
        style={{ backgroundColor: '#f8faf8', color: '#1f2937' }}
      >
        {children}
      </body>
    </html>
  );
}
