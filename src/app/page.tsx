import Link from "next/link";
import { Star, Shield, Smartphone, QrCode, BarChart3, Award } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <header className="px-4 lg:px-6 h-16 flex items-center justify-between border-b bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <Link className="flex items-center gap-2 font-bold text-xl text-blue-600 dark:text-blue-400" href="/">
          <Star className="h-6 w-6 fill-current text-blue-600 dark:text-blue-400" />
          <span>ReviewFlow AI</span>
        </Link>
        <nav className="flex items-center gap-4 sm:gap-6">
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="/login">
            Sign In
          </Link>
          <Link
            className="inline-flex h-9 items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            href="/login?signup=true"
          >
            Get Started
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-slate-50 dark:bg-slate-950">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-extrabold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  AI-Powered Customer Reputation Operating System
                </h1>
                <p className="mx-auto max-w-[700px] text-slate-500 md:text-xl dark:text-slate-400">
                  Generate positive public reviews automatically. Capture negative feedback internally before it hits the web. Empower your staff with real-time performance analytics.
                </p>
              </div>
              <div className="space-x-4">
                <Link
                  className="inline-flex h-11 items-center justify-center rounded-md bg-blue-600 px-8 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-blue-700 focus-visible:outline-none"
                  href="/login?signup=true"
                >
                  Create Free Account
                </Link>
                <Link
                  className="inline-flex h-11 items-center justify-center rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-8 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                  href="/login"
                >
                  Sign In to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="container px-4 md:px-6">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col items-center text-center p-4 border border-slate-100 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950">
                <QrCode className="h-10 w-10 text-blue-600 dark:text-blue-400 mb-4" />
                <h3 className="text-lg font-bold">Smart QR Codes</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Deploy custom codes for receptions, tables, chairs, or staff members. Instantly link visits to ratings.
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-4 border border-slate-100 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950">
                <Shield className="h-10 w-10 text-blue-600 dark:text-blue-400 mb-4" />
                <h3 className="text-lg font-bold">Negative Review Shield</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Low ratings (1-3) prompt a private internal ticket form. Happy ratings (4-5) automatically redirect to public platforms.
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-4 border border-slate-100 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950">
                <Award className="h-10 w-10 text-blue-600 dark:text-blue-400 mb-4" />
                <h3 className="text-lg font-bold">Staff Analytics</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Monitor performance rankings for every staff member. Motivate stylists, waiters, or doctors with exact feedback metrics.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 lg:px-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          &copy; 2026 ReviewFlow AI. All rights reserved.
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Terms of Service
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Privacy Policy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
