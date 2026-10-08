import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TeeHold — Lesson deposits for golf coaches",
  description:
    "Clients book online and pay a deposit before they hit your calendar. Stop no-shows from stealing lesson revenue.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
