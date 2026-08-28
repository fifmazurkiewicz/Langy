import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ApiPulseBanner } from "@/components/ApiPulseBanner";
import { ApiPulseProvider } from "@/components/ApiPulseProvider";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "Langy",
  description: "Voice-first language learning",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Langy",
  },
};

export const viewport: Viewport = {
  themeColor: "#16130f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full dark">
      <body className="min-h-full flex flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
        <ApiPulseProvider>
          <AuthProvider>
            <ApiPulseBanner />
            {children}
          </AuthProvider>
        </ApiPulseProvider>
      </body>
    </html>
  );
}
