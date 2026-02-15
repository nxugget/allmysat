import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StarsBackground } from "@/components/ui/stars-background";

export const metadata: Metadata = {
  title: "AllMySat - Track Satellites in Real Time",
  description: "AR satellite tracking app. Coming soon on iOS App Store.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-white relative overflow-x-hidden">
        <div className="fixed inset-0 pointer-events-none z-0">
          <StarsBackground />
        </div>
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
