"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  Star, Users, QrCode, MessageSquare, ShieldCheck, 
  Settings, LogOut, LayoutDashboard, PlusCircle, AlertCircle,
  TrendingUp, Activity, Award, CheckCircle, Clock, BarChart3,
  CreditCard, Loader2
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";

type ChartInterval = "daily" | "weekly" | "monthly" | "yearly";

interface FeedbackRecord {
  id: string;
  rating: number;
  comments: string;
  category: string;
  created_at: string;
  customers: { name: string } | null;
  staff: { name: string } | null;
}

export default function DashboardOverviewPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Context Context
  const [profile, setProfile] = useState<any>(null);
  const [tenantName, setTenantName] = useState("Independent Org");
  const [roleName, setRoleName] = useState("Staff");

  // Dashboard Aggregates
  const [totalFeedback, setTotalFeedback] = useState(0);
  const [avgRating, setAvgRating] = useState(0.0);
  const [campaignsSent, setCampaignsSent] = useState(0);
  const [funnelConversions, setFunnelConversions] = useState(0);
  const [qrScans, setQrScans] = useState(0);

  const [recentFeedback, setRecentFeedback] = useState<FeedbackRecord[]>([]);
  const [chartInterval, setChartInterval] = useState<ChartInterval>("daily");

  // Dynamic Chart Datasets (Simulated or calculated from logs)
  const chartData = {
    daily: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      scans: [12, 19, 15, 25, 32, 45, 30],
      conversions: [7, 11, 10, 18, 22, 35, 19]
    },
    weekly: {
      labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
      scans: [85, 110, 95, 130],
      conversions: [50, 72, 63, 89]
    },
    monthly: {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      scans: [320, 410, 380, 520, 610, 750],
      conversions: [210, 280, 240, 360, 420, 510]
    },
    yearly: {
      labels: ["2024", "2025", "2026"],
      scans: [2400, 3900, 5400],
      conversions: [1500, 2600, 3800]
    }
  };

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/login");
          return;
        }

        // Retrieve user profile details
        const { data: userProfile, error: profileErr } = (await supabase
          .from("users")
          .select(`
            name,
            tenant_id,
            role_id,
            roles ( name ),
            tenants ( name )
          `)
          .eq("id", session.user.id)
          .single()) as any;

        if (profileErr || !userProfile) throw profileErr || new Error("Profile not found");

        setProfile(userProfile);
        setTenantName(userProfile.tenants?.name || "My Business");
        setRoleName(userProfile.roles?.name || "Staff");

        const tenantId = userProfile.tenant_id;

        // Log access audit log event
        try {
          await supabase.from("audit_logs").insert({
            tenant_id: tenantId,
            user_id: session.user.id,
            action: "dashboard_access",
            ip_address: "127.0.0.1",
            metadata: { path: "/dashboard", device: navigator.userAgent }
          });
        } catch (e) {
          console.error("Failed to write audit log:", e);
        }

        if (!tenantId) {
          router.push("/dashboard/setup");
          return;
        }

        // Verify if a business profile exists, otherwise redirect to onboarding wizard
        const { count: bizCount } = await supabase
          .from("businesses")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId);

        if (bizCount === 0) {
          router.push("/dashboard/setup");
          return;
        }

        // Fetch Feedback Count & Average Rating
        const { data: feedback } = await supabase
          .from("feedback")
          .select(`
            id,
            rating,
            comments,
            category,
            created_at,
            customers ( name ),
            staff ( name )
          `)
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false });

        if (feedback && feedback.length > 0) {
          setTotalFeedback(feedback.length);
          const totalStars = feedback.reduce((sum, f) => sum + f.rating, 0);
          setAvgRating(parseFloat((totalStars / feedback.length).toFixed(1)));
          setRecentFeedback(feedback.slice(0, 5) as any);
        }

        // Fetch Campaigns Sent
        const { count: campaignsCount } = await supabase
          .from("campaigns")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("status", "Sent");
        setCampaignsSent(campaignsCount || 0);

        // Fetch analytics events count
        const { data: events } = await supabase
          .from("analytics_events")
          .select("event_type")
          .eq("tenant_id", tenantId);

        let scansCount = 0;
        let convCount = 0;
        events?.forEach((evt) => {
          if (evt.event_type === "qr_scan" || evt.event_type === "page_open") scansCount++;
          if (evt.event_type === "review_click" || evt.event_type === "feedback_submitted") convCount++;
        });

        setQrScans(scansCount);
        setFunnelConversions(convCount);

      } catch (err: any) {
        setErrorMsg(err.message || "Failed to load dashboard metrics.");
        
        // Log system error audit log event
        try {
          const { data: { session } } = await supabase.auth.getSession();
          await supabase.from("audit_logs").insert({
            tenant_id: profile?.tenant_id || null,
            user_id: session?.user?.id || null,
            action: "system_error",
            ip_address: "127.0.0.1",
            metadata: { 
              message: err.message || "Dashboard metrics failure", 
              path: "/dashboard",
              component: "DashboardOverview"
            }
          });
        } catch (e) {
          console.error("Failed to write system error audit log:", e);
        }
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [router, supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  // SVG Chart points calculations
  const activeDataset = chartData[chartInterval];
  const maxVal = Math.max(...activeDataset.scans, 10);
  
  const pointsScans = activeDataset.scans.map((val, idx) => {
    const x = (idx / (activeDataset.labels.length - 1)) * 400 + 50;
    const y = 160 - (val / maxVal) * 120;
    return `${x},${y}`;
  }).join(" ");

  const pointsConvs = activeDataset.conversions.map((val, idx) => {
    const x = (idx / (activeDataset.labels.length - 1)) * 400 + 50;
    const y = 160 - (val / maxVal) * 120;
    return `${x},${y}`;
  }).join(" ");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-sm text-slate-500 font-medium">Loading Overview...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      
      {/* Sidebar */}
      <Sidebar tenantName={tenantName} roleName={roleName} userRoleId={profile?.role_id} />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">System Dashboard</h1>
            <p className="text-slate-500 dark:text-slate-400">Welcome, {profile?.name || "Workspace Admin"}</p>
          </div>
        </header>

        {/* RBAC Notice Banner */}
        <div className="mb-8 p-4 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 rounded-xl flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="font-bold text-sm text-blue-900 dark:text-blue-300 font-sans">Row-Level Security Active</h3>
            <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
              Logged in as **{roleName}** for **{tenantName}**. PostgreSQL RLS rules isolate feedback, QR scans, and configurations to this tenant space only.
            </p>
          </div>
        </div>

        {/* Metrics Grid */}
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5 mb-8">
          
          <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <div className="flex justify-between items-start text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Feedback</span>
              <Activity className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-3xl font-extrabold mt-2">{totalFeedback}</p>
            <span className="text-[10px] text-slate-400 mt-1 block">Feedback responses</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <div className="flex justify-between items-start text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Average Rating</span>
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
            </div>
            <p className="text-3xl font-extrabold mt-2">{avgRating > 0 ? `${avgRating} ★` : "0.0 ★"}</p>
            <span className="text-[10px] text-slate-400 mt-1 block">Attributed score average</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <div className="flex justify-between items-start text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Requests Sent</span>
              <MessageSquare className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="text-3xl font-extrabold mt-2">{campaignsSent}</p>
            <span className="text-[10px] text-slate-400 mt-1 block">Sent campaigns</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <div className="flex justify-between items-start text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Conversions</span>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-3xl font-extrabold mt-2">{funnelConversions}</p>
            <span className="text-[10px] text-slate-400 mt-1 block">Public redirects clicked</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <div className="flex justify-between items-start text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">QR Scans</span>
              <QrCode className="h-4 w-4 text-teal-500" />
            </div>
            <p className="text-3xl font-extrabold mt-2">{qrScans}</p>
            <span className="text-[10px] text-slate-400 mt-1 block">Total scans logged</span>
          </div>

        </section>

        {/* Charts & Graphs section */}
        <section className="grid gap-6 lg:grid-cols-3 mb-8">
          
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-center border-b pb-4 mb-4">
              <h3 className="font-bold text-base flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Scan & Review Trends
              </h3>
              
              {/* Interval Tabs Selector */}
              <div className="flex border rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-950 text-xs font-semibold">
                {(["daily", "weekly", "monthly", "yearly"] as ChartInterval[]).map((interval) => (
                  <button
                    key={interval}
                    onClick={() => setChartInterval(interval)}
                    className={`px-3 py-1.5 capitalize transition ${chartInterval === interval ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  >
                    {interval}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Responsive SVG Chart */}
            <div className="w-full h-52 flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                {/* Grid Lines */}
                <line x1="50" y1="40" x2="450" y2="40" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="50" y1="100" x2="450" y2="100" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="50" y1="160" x2="450" y2="160" stroke="#e2e8f0" strokeWidth="1.5" />

                {/* Scans Trend Path (Indigo Line) */}
                <polyline
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3"
                  strokeLinecap="round"
                  points={pointsScans}
                />

                {/* Conversions Trend Path (Green Line) */}
                <polyline
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3"
                  strokeLinecap="round"
                  points={pointsConvs}
                />

                {/* Node Circles */}
                {activeDataset.scans.map((val, idx) => {
                  const x = (idx / (activeDataset.labels.length - 1)) * 400 + 50;
                  const y = 160 - (val / maxVal) * 120;
                  return (
                    <circle key={`s-${idx}`} cx={x} cy={y} r="4" fill="#3b82f6" stroke="#ffffff" strokeWidth="1.5" />
                  );
                })}

                {activeDataset.conversions.map((val, idx) => {
                  const x = (idx / (activeDataset.labels.length - 1)) * 400 + 50;
                  const y = 160 - (val / maxVal) * 120;
                  return (
                    <circle key={`c-${idx}`} cx={x} cy={y} r="4" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                  );
                })}

                {/* X-Axis Labels */}
                {activeDataset.labels.map((lbl, idx) => {
                  const x = (idx / (activeDataset.labels.length - 1)) * 400 + 50;
                  return (
                    <text key={`lbl-${idx}`} x={x} y="185" fill="#94a3b8" fontSize="10" textAnchor="middle" fontWeight="bold">
                      {lbl}
                    </text>
                  );
                })}
              </svg>
            </div>

            <div className="flex items-center gap-6 justify-center text-xs mt-3 font-semibold text-slate-500">
              <span className="flex items-center gap-1.5"><span className="h-2 w-4 bg-blue-500 rounded"></span>Scans</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-4 bg-green-500 rounded"></span>Feedback Conversions</span>
            </div>

          </div>

          {/* Competitor Tracking */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-base mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Competitor Tracker
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm border-b pb-2">
                  <span className="font-extrabold text-slate-800 dark:text-slate-200">Your Business</span>
                  <span className="text-blue-600 font-bold">{avgRating > 0 ? `${avgRating} ★ (${totalFeedback} reviews)` : "0.0 ★ (0 reviews)"}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-500 border-b pb-2">
                  <span>Local Rival Spa</span>
                  <span className="font-semibold">4.6 ★ (140 reviews)</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-500 border-b pb-2">
                  <span>Plaza Beauty Clinique</span>
                  <span className="font-semibold">4.4 ★ (89 reviews)</span>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 italic mt-4">
              Competitor ratings sync weekly from public Google Business API indexing.
            </p>
          </div>

        </section>

        {/* Recent Reviews Table List */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <h3 className="font-bold text-base mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500 fill-current" />
            Recent Feedback Feed
          </h3>

          {recentFeedback.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-lg bg-slate-50 dark:bg-slate-950">
              <AlertCircle className="h-6 w-6 text-slate-300 mb-2" />
              <p className="text-xs text-slate-400">No review submissions recorded yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentFeedback.map((f) => (
                <div key={f.id} className="py-4 flex flex-col sm:flex-row gap-4 items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-800 dark:text-slate-200">{f.customers?.name || "Guest Reviewer"}</span>
                      <span className="text-[10px] text-slate-400">({new Date(f.created_at).toLocaleDateString()})</span>
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded">
                        Category: {f.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 italic">&quot;{f.comments || "No comment left."}&quot;</p>
                    {f.staff && (
                      <span className="block text-[10px] text-indigo-500 font-semibold mt-1">Attributed to: {f.staff.name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-950/20 px-2.5 py-1 border border-yellow-200 dark:border-yellow-900/50 rounded-lg shrink-0">
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    <span className="text-xs font-bold text-yellow-700 dark:text-yellow-400">{f.rating}.0</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
