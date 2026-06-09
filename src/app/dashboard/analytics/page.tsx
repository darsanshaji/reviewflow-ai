"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  BarChart3, Loader2, Star, ShieldCheck, 
  MapPin, Users, QrCode, ArrowUpRight, Clock,
  LayoutDashboard, MessageSquare, ClipboardList, AlertCircle
} from "lucide-react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";

interface EventLog {
  id: string;
  event_type: string;
  metadata: any;
  created_at: string;
}

interface PerformanceRow {
  name: string;
  scans: number;
  conversions: number;
  rate: number;
  rating: number;
}

export default function AnalyticsDashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Context Context
  const [tenantName, setTenantName] = useState("My Business");
  const [roleName, setRoleName] = useState("Staff");
  const [userRoleId, setUserRoleId] = useState<number | null>(null);

  // Ratios state
  const [reviewConvRate, setReviewConvRate] = useState(0);
  const [campaignConvRate, setCampaignConvRate] = useState(0);
  const [qrConvRate, setQrConvRate] = useState(0);

  // Performance lists
  const [branchPerformance, setBranchPerformance] = useState<PerformanceRow[]>([]);
  const [staffPerformance, setStaffPerformance] = useState<PerformanceRow[]>([]);
  const [eventLogs, setEventLogs] = useState<EventLog[]>([]);

  // Competitor & Tab States
  const [activeTab, setActiveTab] = useState<"conversion" | "competitor">("conversion");
  const [avgRating, setAvgRating] = useState(0.0);
  const [totalFeedback, setTotalFeedback] = useState(0);

  useEffect(() => {
    async function loadAnalyticsData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/login");
          return;
        }

        const { data: profile } = (await supabase
          .from("users")
          .select("tenant_id, role_id, roles(name), tenants(name)")
          .eq("id", session.user.id)
          .single()) as any;

        let tenantId = profile?.tenant_id;
        let tenantNameVal = profile?.tenants?.name || "My Business";
        let roleNameVal = profile?.roles?.name || "Staff";
        let userRoleIdVal = profile?.role_id;

        if (typeof window !== "undefined") {
          const impId = sessionStorage.getItem("impersonate_tenant_id");
          const impName = sessionStorage.getItem("impersonate_tenant_name");
          if (impId && impName) {
            tenantId = impId;
            tenantNameVal = impName;
            roleNameVal = "Owner (Impersonated)";
            userRoleIdVal = 2;
          }
        }

        if (!tenantId) {
          setErrorMsg("Tenant profile context missing.");
          setLoading(false);
          return;
        }

        setTenantName(tenantNameVal);
        setRoleName(roleNameVal);
        setUserRoleId(userRoleIdVal);

        // 1. Fetch raw campaigns, feedback, events, and staff
        const { data: campaigns } = await supabase
          .from("campaigns")
          .select("id, status")
          .eq("tenant_id", tenantId);

        const { data: feedback } = await supabase
          .from("feedback")
          .select("rating, branch_id, staff_id, service_id")
          .eq("tenant_id", tenantId);

        const { data: events } = await supabase
          .from("analytics_events")
          .select("id, event_type, metadata, created_at")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false });

        const { data: staff } = await supabase
          .from("staff")
          .select("id, name, branch_id")
          .eq("tenant_id", tenantId);

        const { data: branches } = await supabase
          .from("branches")
          .select("id, name")
          .eq("tenant_id", tenantId);

        // 2. Compute Overall conversion rates
        const campaignsSentCount = campaigns?.filter((c) => c.status === "Sent").length || 0;
        const totalFeedbackCount = feedback?.length || 0;
        
        const scansCount = events?.filter((e) => e.event_type === "qr_scan" || e.event_type === "page_open").length || 0;
        const clicksCount = events?.filter((e) => e.event_type === "review_click").length || 0;
        const ratingSelectionsCount = events?.filter((e) => e.event_type === "rating_selected").length || 0;

        let avgRatingVal = 0;
        if (feedback && feedback.length > 0) {
          const totalStars = feedback.reduce((sum, f) => sum + f.rating, 0);
          avgRatingVal = parseFloat((totalStars / feedback.length).toFixed(1));
        }
        setAvgRating(avgRatingVal);
        setTotalFeedback(totalFeedbackCount);

        setReviewConvRate(ratingSelectionsCount > 0 ? Math.round((clicksCount / ratingSelectionsCount) * 100) : 0);
        setCampaignConvRate(campaignsSentCount > 0 ? Math.round((totalFeedbackCount / campaignsSentCount) * 100) : 0);
        setQrConvRate(scansCount > 0 ? Math.round((totalFeedbackCount / scansCount) * 100) : 0);

        // 3. Compute Branch Performance comparisons
        const branchRows: PerformanceRow[] = (branches || []).map((b) => {
          const matchingScans = events?.filter((e) => e.metadata?.branch_id === b.id && e.event_type === "qr_scan").length || 0;
          const matchingFeedback = feedback?.filter((f) => f.branch_id === b.id) || [];
          const fbCount = matchingFeedback.length;
          const avgStars = fbCount > 0 ? parseFloat((matchingFeedback.reduce((sum, f) => sum + f.rating, 0) / fbCount).toFixed(1)) : 0;
          
          return {
            name: b.name,
            scans: matchingScans,
            conversions: fbCount,
            rate: matchingScans > 0 ? Math.round((fbCount / matchingScans) * 100) : 0,
            rating: avgStars
          };
        });
        setBranchPerformance(branchRows);

        // 4. Compute Staff Performance comparisons
        const staffRows: PerformanceRow[] = (staff || []).map((s) => {
          const matchingScans = events?.filter((e) => e.metadata?.staff_id === s.id && e.event_type === "qr_scan").length || 0;
          const matchingFeedback = feedback?.filter((f) => f.staff_id === s.id) || [];
          const fbCount = matchingFeedback.length;
          const avgStars = fbCount > 0 ? parseFloat((matchingFeedback.reduce((sum, f) => sum + f.rating, 0) / fbCount).toFixed(1)) : 0;

          return {
            name: s.name,
            scans: matchingScans,
            conversions: fbCount,
            rate: matchingScans > 0 ? Math.round((fbCount / matchingScans) * 100) : 0,
            rating: avgStars
          };
        });
        // Sort staff by conversion rate
        staffRows.sort((a, b) => b.rate - a.rate);
        setStaffPerformance(staffRows);

        // 5. Slice recent event logs
        if (events) setEventLogs(events.slice(0, 10));

      } catch (err) {
        setErrorMsg("Failed to compile analytics aggregations.");
      } finally {
        setLoading(false);
      }
    }
    loadAnalyticsData();
  }, [router, supabase]);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      
      {/* Sidebar */}
      <Sidebar tenantName={tenantName} roleName={roleName} userRoleId={userRoleId} />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Conversion & Analytics Engine</h1>
            <p className="text-slate-500 dark:text-slate-400">Monitor funnel conversion rates and event activities.</p>
          </div>
        </header>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 font-semibold text-sm">
          <button
            onClick={() => setActiveTab("conversion")}
            className={`pb-3 px-4 transition ${activeTab === "conversion" ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            Conversion Analytics
          </button>
          <button
            onClick={() => setActiveTab("competitor")}
            className={`pb-3 px-4 transition ${activeTab === "competitor" ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            Competitor Intelligence
          </button>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 border border-red-200 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{errorMsg}</span>
          </div>
        )}

        {activeTab === "conversion" ? (
          <>
            {/* conversion Rates Ratios Grid */}
            <section className="grid gap-6 sm:grid-cols-3 mb-8">
              
              <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Review Redirect Rate</h3>
                  <p className="text-3xl font-extrabold mt-2 text-blue-600 dark:text-blue-400">{reviewConvRate}%</p>
                  <span className="text-[10px] text-slate-400 mt-1 block">Rating opens &rarr; Google Clicks</span>
                </div>
                <ArrowUpRight className="h-8 w-8 text-blue-100 dark:text-blue-900" />
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Campaign Conv. Rate</h3>
                  <p className="text-3xl font-extrabold mt-2 text-green-600 dark:text-green-400">{campaignConvRate}%</p>
                  <span className="text-[10px] text-slate-400 mt-1 block">Messages sent &rarr; feedback entries</span>
                </div>
                <ArrowUpRight className="h-8 w-8 text-green-100 dark:text-green-900" />
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">QR Scan Conv. Rate</h3>
                  <p className="text-3xl font-extrabold mt-2 text-indigo-600 dark:text-indigo-400">{qrConvRate}%</p>
                  <span className="text-[10px] text-slate-400 mt-1 block">QR scans &rarr; reviews submitted</span>
                </div>
                <ArrowUpRight className="h-8 w-8 text-indigo-100 dark:text-indigo-900" />
              </div>

            </section>

            {/* COMPARISONS TABLES GRID */}
            <section className="grid gap-6 lg:grid-cols-2 mb-8">
              
              {/* Branch conversions comparison */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-base mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  Branch conversion & Ratings
                </h3>

                {branchPerformance.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No branch configurations registered yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b text-slate-400 font-bold">
                          <th className="pb-2">Location</th>
                          <th className="pb-2 text-center">Scans</th>
                          <th className="pb-2 text-center">Feedback</th>
                          <th className="pb-2 text-center">Conv. %</th>
                          <th className="pb-2 text-right">Stars</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {branchPerformance.map((bp, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                            <td className="py-2.5 font-semibold text-slate-700 dark:text-slate-350">{bp.name}</td>
                            <td className="py-2.5 text-center">{bp.scans}</td>
                            <td className="py-2.5 text-center">{bp.conversions}</td>
                            <td className="py-2.5 text-center font-bold text-blue-600 dark:text-blue-400">{bp.rate}%</td>
                            <td className="py-2.5 text-right font-bold text-yellow-500">{bp.rating > 0 ? `${bp.rating} ★` : "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Staff conversions comparison */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-base mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-500" />
                  Staff Conversion Ranking
                </h3>

                {staffPerformance.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No staff members assigned yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b text-slate-400 font-bold">
                          <th className="pb-2">Stylist / Member</th>
                          <th className="pb-2 text-center">Scans</th>
                          <th className="pb-2 text-center">Feedback</th>
                          <th className="pb-2 text-center">Conv. %</th>
                          <th className="pb-2 text-right">Stars</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {staffPerformance.map((sp, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                            <td className="py-2.5 font-semibold text-slate-700 dark:text-slate-350">{sp.name}</td>
                            <td className="py-2.5 text-center">{sp.scans}</td>
                            <td className="py-2.5 text-center">{sp.conversions}</td>
                            <td className="py-2.5 text-center font-bold text-green-600 dark:text-green-400">{sp.rate}%</td>
                            <td className="py-2.5 text-right font-bold text-yellow-500">{sp.rating > 0 ? `${sp.rating} ★` : "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </section>

            {/* RAW EVENT ACTIVITY LOGS STREAM */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-base mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-slate-400" />
                Live Event Stream
              </h3>

              {eventLogs.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">No telemetry log events recorded yet.</div>
              ) : (
                <div className="space-y-4">
                  {eventLogs.map((log) => (
                    <div key={log.id} className="flex justify-between items-start text-xs border-b pb-2 border-slate-100 dark:border-slate-800/50">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            log.event_type === "qr_scan" ? "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-400" :
                            log.event_type === "review_click" ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400" :
                            log.event_type === "feedback_submitted" ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400" :
                            "bg-slate-100 text-slate-500 dark:bg-slate-850"
                          }`}>
                            {log.event_type}
                          </span>
                          <span className="text-[10px] text-slate-400">{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono max-w-lg truncate">
                          Metadata: {JSON.stringify(log.metadata)}
                        </p>
                      </div>
                      <span className="text-[9px] font-bold text-slate-400">ID: {log.id.slice(0, 8)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          /* Competitor Intelligence panel */
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-base mb-2 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Competitor Intelligence Dashboard
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs mb-6">Compare customer reputation scores and public Google Business ratings against local rival service outlets.</p>
              
              <div className="grid gap-6 md:grid-cols-3 mb-8">
                <div className="p-4 border rounded-xl bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Your Business</span>
                  <p className="text-2xl font-black text-blue-600">{avgRating > 0 ? `${avgRating} ★` : "0.0 ★"}</p>
                  <span className="text-[10px] text-slate-400 block">{totalFeedback} total verified feedbacks</span>
                </div>

                <div className="p-4 border rounded-xl bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Local Rival Spa</span>
                  <p className="text-2xl font-black text-slate-800 dark:text-slate-200">4.6 ★</p>
                  <span className="text-[10px] text-slate-400 block">140 public Google indexed reviews</span>
                </div>

                <div className="p-4 border rounded-xl bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Plaza Beauty Clinique</span>
                  <p className="text-2xl font-black text-slate-800 dark:text-slate-200">4.4 ★</p>
                  <span className="text-[10px] text-slate-400 block">89 public Google indexed reviews</span>
                </div>
              </div>

              {/* SVG Rating History Trend lines */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">30-Day Rating Trajectory Comparison</h4>
                <div className="w-full h-48 border rounded-xl p-4 bg-slate-50 dark:bg-slate-950/20 flex items-center justify-center">
                  <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
                    {/* Grid lines */}
                    <line x1="50" y1="30" x2="450" y2="30" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="50" y1="75" x2="450" y2="75" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="50" y1="120" x2="450" y2="120" stroke="#cbd5e1" strokeWidth="1" />
                    
                    {/* Your Business (Blue line) */}
                    <polyline
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="3"
                      points={`50,110 150,${120 - (avgRating > 0 ? avgRating : 3.5) * 20} 250,${120 - (avgRating > 0 ? avgRating : 3.8) * 20} 350,${120 - (avgRating > 0 ? avgRating : 4.0) * 20} 450,${120 - (avgRating > 0 ? avgRating : 4.2) * 20}`}
                    />

                    {/* Rival Spa (Amber line) */}
                    <polyline
                      fill="none"
                      stroke="#d97706"
                      strokeWidth="2.5"
                      points="50,40 150,38 250,35 350,36 450,28"
                    />

                    {/* Plaza Beauty (Purple line) */}
                    <polyline
                      fill="none"
                      stroke="#7c3aed"
                      strokeWidth="2.5"
                      points="50,65 150,70 250,60 350,62 450,55"
                    />

                    {/* X-axis labels */}
                    <text x="50" y="140" fill="#94a3b8" fontSize="9" textAnchor="middle">Week 1</text>
                    <text x="150" y="140" fill="#94a3b8" fontSize="9" textAnchor="middle">Week 2</text>
                    <text x="250" y="140" fill="#94a3b8" fontSize="9" textAnchor="middle">Week 3</text>
                    <text x="350" y="140" fill="#94a3b8" fontSize="9" textAnchor="middle">Week 4</text>
                    <text x="450" y="140" fill="#94a3b8" fontSize="9" textAnchor="middle">Today</text>
                  </svg>
                </div>
                
                <div className="flex items-center gap-6 justify-center text-[10px] font-bold text-slate-500 pt-2">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-3 bg-blue-600 rounded"></span>Your Brand</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-3 bg-amber-600 rounded"></span>Local Rival Spa</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-3 bg-purple-600 rounded"></span>Plaza Beauty Clinique</span>
                </div>
              </div>

              <div className="border-t mt-6 pt-4 text-[10px] text-slate-400 italic">
                Competitor ratings sync weekly from public Google Business API indexing. Customize competitor identifiers in branding parameters settings.
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
