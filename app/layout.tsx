import type { Metadata } from "next";
import { serverEnv } from "@/lib/env/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Precision Philanthropy",
  description: "Impact-first golf charity subscription platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fail fast when required server environment variables are missing.
  void serverEnv;

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
