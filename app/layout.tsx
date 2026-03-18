import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import ToastContainer from "@/components/Toast";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "PRL Automated — MLBB Tournament Registration Verification",
  description: "Automate Mobile Legends tournament registration verification. Verify Player IDs against the official server, sync Google Sheets, and manage your tournament operations.",
  keywords: ["MLBB", "Mobile Legends", "tournament", "registration", "verification", "automation"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className={inter.className}>
        <div className="animated-bg" />
        <main className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto relative">
          {children}
        </main>
        <ToastContainer />
      </body>
    </html>
  );
}
