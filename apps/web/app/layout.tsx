import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import "./globals.css";

const lexend = localFont({
  src: "../assets/fonts/Lexend/Lexend-Regular.ttf",
  variable: "--font-lexend",
  display: "swap",
});

const orbitron = localFont({
  src: "../assets/fonts/Orbitron/Orbitron-Regular.ttf",
  variable: "--font-orbitron",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NetMifi Quiz Arena",
  description: "NetMifi Quiz Arena",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${lexend.variable} ${orbitron.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
