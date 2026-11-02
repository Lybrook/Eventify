import type { Metadata } from "next";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

import "./globals.css";

export const metadata: Metadata = {
  title: "Eventify | Find your next great moment",
  description: "Discover, book, and manage the best events across Kenya.",
  applicationName: "Eventify",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
  },
  openGraph: {
    type: "website",
    siteName: "Eventify",
    title: "Eventify | Find your next great moment",
    description: "Discover, book, and manage the best events across Kenya.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-sand text-ink antialiased">
        <Navbar />
        <main className="min-h-screen pt-20">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
