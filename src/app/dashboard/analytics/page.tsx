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

  useEffect(() => {
    async function loadAnalyticsData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/login");
          return;
        }

        const { data: profile } = await supabase
          .from("users")
          .select("tenant_id, role_id, roles(name), tenants(name)")
          .eq("id", session.user.id)
          .single();

        if (!profile?.tenant_id) {
          setErrorMsg("Tenant profile context missing.");
          setLoading(false);
          return;
        }

        setTenantName(profile.tenants?.name || "My Business");
        setRoleName(profile.roles?.name || "Staff");
        setUserRoleId(profile.role_id);

        const tenantId = profile.tenant_id;

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

        {errorMsg && (
          <div className="mb-6 p-4 border border-red-200 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* conversion Rates Ratios Grid */}
        <section className="grid gap-6 sm:grid-cols-3 mb-8">
          
          <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Review Redirect Rate</h3>
              <p className="text-3xl font-extrabold mt-2 text-blue-600 dark:text-blue-400">{reviewConvRate}%</p>
              <span className="text-[10px] text-slate-400 mt-1 block">Rating opens -> Google Clicks</span>
            </div>
            <ArrowUpRight className="h-8 w-8 text-blue-100 dark:text-blue-900" />
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Campaign Conv. Rate</h3>
              <p className="text-3xl font-extrabold mt-2 text-green-600 dark:text-green-400">{campaignConvRate}%</p>
              <span className="text-[10px] text-slate-400 mt-1 block">Messages sent -> feedback entries</span>
            </div>
            <ArrowUpRight className="h-8 w-8 text-green-100 dark:text-green-900" />
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">QR Scan Conv. Rate</h3>
              <p className="text-3xl font-extrabold mt-2 text-indigo-600 dark:text-indigo-400">{qrConvRate}%</p>
              <span className="text-[10px] text-slate-400 mt-1 block">QR scans -> reviews submitted</span>
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

      </main>
    </div>
  );
}
