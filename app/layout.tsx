import type { Metadata } from "next";
import localFont from "next/font/local";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

const ttHovesPro = localFont({
  src: "../public/fonts/tt_hoves_pro/TT Hoves Pro Trial Medium.ttf",
  weight: "500",
  style: "normal",
  display: "swap",
  variable: "--font-tt-hoves-pro",
});

export const metadata: Metadata = {
  title: "CUUB Dashboard",
  description: "CUUB Project dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={ttHovesPro.variable}>
      <body className="font-sans bg-cuub-bg text-cuub-fg">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
