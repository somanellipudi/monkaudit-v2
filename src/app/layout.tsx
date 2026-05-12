import type { Metadata } from "next";
import { GlobalInteractionFeedback } from "@/components/GlobalInteractionFeedback";
import "./globals.css";

export const metadata: Metadata = {
  title: "GrowingMonk MonkAudit",
  description: "MonkAudit workspace for prospect research, client-safe reports, and follow-ups.",
  icons: {
    icon: "/favicon-32.png",
    shortcut: "/favicon-32.png",
    apple: "/favicon-32.png"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <GlobalInteractionFeedback />
        {children}
      </body>
    </html>
  );
}
