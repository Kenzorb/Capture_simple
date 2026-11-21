import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Capture",
    template: "%s | Capture",
  },
  description: "Save useful articles and build a searchable personal library.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
