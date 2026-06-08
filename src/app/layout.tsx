import type { Metadata } from "next";
import "./globals.css";
import PWARegistration from "@/components/PWARegistration";

export const metadata: Metadata = {
  title: "ReviewFlow AI - Reputation Management System",
  description: "Enterprise multi-tenant platform for automated review management, negative feedback collection, and staff analytics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
        <PWARegistration />
        {children}
      </body>
    </html>
  );
}
