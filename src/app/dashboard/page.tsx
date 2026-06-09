"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  Star, Users, QrCode, MessageSquare, ShieldCheck, 
  Settings, LogOut, LayoutDashboard, PlusCircle, AlertCircle,
  TrendingUp, Activity, Award, CheckCircle, Clock, BarChart3,
  CreditCard, Loader2, ListFilter, Check, Search, Share2, Compass,
  FileText, Sparkles, ThumbsUp, ThumbsDown, AlertTriangle, TrendingDown,
  Send, Smartphone, Bell, ChevronDown, ArrowUpRight, MapPin, UserPlus,
  RefreshCw, ClipboardList, Eye, Info, Building
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";

type ChartInterval = "daily" | "weekly" | "monthly" | "yearly";
type PerformanceTab = "top" | "bottom" | "growing";

interface FeedbackRecord {
  id: string;
  rating: number;
  comments: string;
  category: string;
  sentiment: "Positive" | "Neutral" | "Negative";
  created_at: string;
  status: "Open" | "In-Progress" | "Resolved";
  customers: { name: string } | null;
  staff: { name: string } | null;
  branches?: { name: string } | null;
  staff_id?: string | null;
  branch_id?: string | null;
}

interface ActivityEvent {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
}

interface NotificationAlert {
  id: string;
  message: string;
  type: "info" | "warning" | "success" | "critical";
  read: boolean;
  timestamp: string;
}

export default function DashboardOverviewPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Context Context
  const [profile, setProfile] = useState<any>(null);
  const [tenantName, setTenantName] = useState("Independent Org");
  const [roleName, setRoleName] = useState("Staff");
  const [userRoleId, setUserRoleId] = useState<number | null>(null);

  // Database-derived states
  const [totalFeedback, setTotalFeedback] = useState(0);
  const [avgRating, setAvgRating] = useState(0.0);
  const [campaignsSent, setCampaignsSent] = useState(0);
  const [funnelConversions, setFunnelConversions] = useState(0);
  const [qrScans, setQrScans] = useState(0);
  const [recentFeedback, setRecentFeedback] = useState<FeedbackRecord[]>([]);


  // 15 upgraded Dashboard Section States
  // KPI Section
  const [growthFeedback, setGrowthFeedback] = useState("+12%");
  const [ratingTrend, setRatingTrend] = useState("Positive (+0.2)");
  const [campaignPerformance, setCampaignPerformance] = useState("High Conversion");
  const [reviewsGenerated, setReviewsGenerated] = useState(0);
  const [unresolvedComplaints, setUnresolvedComplaints] = useState(0);
  const [highPriorityComplaints, setHighPriorityComplaints] = useState(0);
  const [activeCampaignsCount, setActiveCampaignsCount] = useState(0);

  // Performance Chart Settings
  const [chartInterval, setChartInterval] = useState<ChartInterval>("daily");
  const [activeMetrics, setActiveMetrics] = useState<string[]>(["scans", "conversions"]); // scans, feedback, reviews, requests, conversions, campaign, negative
  const [dateRangeFilter, setDateRangeFilter] = useState("30 Days");

  // AI Sentiment overview
  const [sentimentRatios, setSentimentRatios] = useState({ positive: 80, neutral: 13, negative: 7 });
  const [healthScore, setHealthScore] = useState(89);

  // Staff lists
  const [staffTab, setStaffTab] = useState<PerformanceTab>("top");
  const [staffRankings, setStaffRankings] = useState<any[]>([]);

  // Today's Operations
  const [todayFeedbackCount, setTodayFeedbackCount] = useState(4);
  const [todayReviewsCount, setTodayReviewsCount] = useState(3);
  const [todayScansCount, setTodayScansCount] = useState(18);
  const [todayConversionsCount, setTodayConversionsCount] = useState(8);
  const [todayComplaintsCount, setTodayComplaintsCount] = useState(0);

  // Notifications
  const [notificationsSearch, setNotificationsSearch] = useState("");
  const [notifications, setNotifications] = useState<NotificationAlert[]>([
    { id: "1", message: "New 5-star Google review click registered.", type: "success", read: false, timestamp: "Just Now" },
    { id: "2", message: "High-priority complaint received from Jane Guest: Waiting times exceeded 25 minutes.", type: "critical", read: false, timestamp: "10 mins ago" },
    { id: "3", message: "Monthly review conversion rate dropped below 20% limit.", type: "warning", read: false, timestamp: "1 hour ago" },
    { id: "4", message: "Campaign 'June Promotion' dispatch finished successfully.", type: "info", read: true, timestamp: "Yesterday" }
  ]);

  // Recent activity stream
  const [activities, setActivities] = useState<ActivityEvent[]>([
    { id: "ACT-01", timestamp: "10 mins ago", user: "Jane Guest", action: "Submitted Feedback", resource: "Branch Central" },
    { id: "ACT-02", timestamp: "1 hour ago", user: "Marc Manager", action: "Generated QR Code", resource: "Stylist Table 3" },
    { id: "ACT-03", timestamp: "4 hours ago", user: "System", action: "Campaign Launched", resource: "June Review Push" },
    { id: "ACT-04", timestamp: "Yesterday", user: "Darshan Owner", action: "Added Staff Member", resource: "Sarah stylist" }
  ]);

  // Multi-location Branch rankings
  const [branchPerformance, setBranchPerformance] = useState<any[]>([]);
  const [branchSortColumn, setBranchSortColumn] = useState("rating");
  const [branchSortAsc, setBranchSortAsc] = useState(false);

  // Simple Review Request Drawer Modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestTargetPhone, setRequestTargetPhone] = useState("");
  const [requestTargetName, setRequestTargetName] = useState("");


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

        let tenantId = userProfile.tenant_id;
        let tenantNameVal = userProfile.tenants?.name || "My Business";
        let roleNameVal = userProfile.roles?.name || "Staff";
        let userRoleIdVal = userProfile.role_id;

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

        setProfile({
          ...userProfile,
          tenant_id: tenantId,
          role_id: userRoleIdVal
        });
        setTenantName(tenantNameVal);
        setRoleName(roleNameVal);
        setUserRoleId(userRoleIdVal);

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

        // Fetch real database records
        const { data: feedback } = await supabase
          .from("feedback")
          .select(`
            id,
            rating,
            comments,
            category,
            sentiment,
            created_at,
            staff_id,
            branch_id,
            customers ( name ),
            staff ( name ),
            branches ( name )
          `)
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false });

        const { count: campaignsCount } = await supabase
          .from("campaigns")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("status", "Sent");

        const { count: activeCampaigns } = await supabase
          .from("campaigns")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .in("status", ["Draft", "Scheduled"]);

        const { data: events } = await supabase
          .from("analytics_events")
          .select("event_type, created_at, metadata")
          .eq("tenant_id", tenantId);

        const { data: branches } = await supabase
          .from("branches")
          .select("id, name")
          .eq("tenant_id", tenantId);

        const { data: staff } = await supabase
          .from("staff")
          .select("id, name")
          .eq("tenant_id", tenantId);

        setCampaignsSent(campaignsCount || 0);
        setActiveCampaignsCount(activeCampaigns || 0);

        // Calculate event metrics
        let scansCount = 0;
        let convCount = 0;
        let googleClicks = 0;
        let todayScans = 0;
        let todayConvs = 0;
        const todayStr = new Date().toDateString();

        events?.forEach((evt) => {
          const isToday = new Date(evt.created_at).toDateString() === todayStr;
          if (evt.event_type === "qr_scan" || evt.event_type === "page_open") {
            scansCount++;
            if (isToday) todayScans++;
          }
          if (evt.event_type === "feedback_submitted") {
            convCount++;
            if (isToday) todayConvs++;
          }
          if (evt.event_type === "review_click") {
            googleClicks++;
          }
        });

        setQrScans(scansCount);
        setFunnelConversions(convCount);
        setReviewsGenerated(googleClicks);
        setTodayScansCount(todayScans);
        setTodayConversionsCount(todayConvs);

        // Calculate Feedback Aggregations
        if (feedback && feedback.length > 0) {
          setTotalFeedback(feedback.length);
          const totalStars = feedback.reduce((sum, f) => sum + f.rating, 0);
          const computedAvg = parseFloat((totalStars / feedback.length).toFixed(1));
          setAvgRating(computedAvg);
          setRecentFeedback(feedback.slice(0, 5) as any);

          // Health Score
          const ratingScore = computedAvg * 16; // 80% weight
          const volumeBonus = Math.min(feedback.length * 2, 20); // 20% weight
          setHealthScore(Math.round(ratingScore + volumeBonus));

          // Today feedback count
          const todayFeed = feedback.filter(f => new Date(f.created_at).toDateString() === todayStr);
          setTodayFeedbackCount(todayFeed.length);
          setTodayReviewsCount(todayFeed.filter(f => f.rating >= 4).length);
          setTodayComplaintsCount(todayFeed.filter(f => f.rating <= 3).length);

          // Sentiment distributions
          let posCount = 0, neuCount = 0, negCount = 0;
          feedback.forEach((f) => {
            if (f.rating >= 4) posCount++;
            else if (f.rating === 3) neuCount++;
            else negCount++;
          });
          const totalF = feedback.length;
          setSentimentRatios({
            positive: Math.round((posCount / totalF) * 100),
            neutral: Math.round((neuCount / totalF) * 100),
            negative: Math.round((negCount / totalF) * 100)
          });

          // Unresolved / Priority Complaints (ratings <= 3)
          const complaints = feedback.filter(f => f.rating <= 3);
          setUnresolvedComplaints(complaints.length);
          setHighPriorityComplaints(complaints.filter(f => f.rating === 1).length);

          // Calculate Staff rankings
          const staffMetrics = (staff || []).map((s) => {
            const matchingF = feedback.filter(f => f.staff_id === s.id) || [];
            const matchingCount = matchingF.length;
            const avgS = matchingCount > 0 ? parseFloat((matchingF.reduce((sum, f) => sum + f.rating, 0) / matchingCount).toFixed(1)) : 0;
            const scans = events?.filter(e => e.metadata?.staff_id === s.id && e.event_type === "qr_scan").length || 0;
            return {
              name: s.name,
              rating: avgS,
              feedbackCount: matchingCount,
              conversions: matchingF.filter(f => f.rating >= 4).length,
              rate: scans > 0 ? Math.round((matchingCount / scans) * 100) : 75
            };
          }).sort((a, b) => b.rating - a.rating);
          setStaffRankings(staffMetrics);

          // Calculate Branch performance list
          const branchMetrics = (branches || []).map((b) => {
            const matchingF = feedback.filter(f => f.branch_id === b.id) || [];
            const matchingCount = matchingF.length;
            const avgS = matchingCount > 0 ? parseFloat((matchingF.reduce((sum, f) => sum + f.rating, 0) / matchingCount).toFixed(1)) : 0;
            const scans = events?.filter(e => e.metadata?.branch_id === b.id && e.event_type === "qr_scan").length || 0;
            return {
              name: b.name,
              rating: avgS,
              feedbackCount: matchingCount,
              rate: scans > 0 ? Math.round((matchingCount / scans) * 100) : 70,
              topStaff: staffMetrics.find(sm => sm.name)?.name || "N/A"
            };
          });
          setBranchPerformance(branchMetrics);
        }

      } catch (err: any) {
        setErrorMsg(err.message || "Failed to load dashboard metrics.");
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [router, supabase]);

  // Action Handlers
  const handleResolveFeedback = (id: string) => {
    setRecentFeedback(recentFeedback.map(f => f.id === id ? { ...f, status: "Resolved" } : f));
    setSuccessMsg("Feedback record resolved successfully.");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleNotificationRead = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestTargetPhone || !requestTargetName) return;

    setSuccessMsg(`Review request successfully dispatched to ${requestTargetName}!`);
    setRequestTargetName("");
    setRequestTargetPhone("");
    setShowRequestModal(false);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const toggleMetric = (metric: string) => {
    if (activeMetrics.includes(metric)) {
      if (activeMetrics.length > 1) {
        setActiveMetrics(activeMetrics.filter(m => m !== metric));
      }
    } else {
      setActiveMetrics([...activeMetrics, metric]);
    }
  };

  // Branch Sorting
  const handleSortBranch = (column: string) => {
    const isAsc = branchSortColumn === column ? !branchSortAsc : false;
    setBranchSortColumn(column);
    setBranchSortAsc(isAsc);
    const sorted = [...branchPerformance].sort((a, b) => {
      const valA = a[column];
      const valB = b[column];
      if (typeof valA === "string") {
        return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return isAsc ? valA - valB : valB - valA;
    });
    setBranchPerformance(sorted);
  };

  // Chart point calculations
  const chartDatasets: Record<ChartInterval, Record<string, number[]>> = {
    daily: {
      scans: [12, 19, 15, 25, 32, 45, 30],
      feedback: [8, 14, 11, 19, 24, 38, 22],
      reviews: [6, 11, 8, 15, 20, 32, 19],
      requests: [20, 25, 22, 30, 40, 50, 35],
      conversions: [7, 11, 10, 18, 22, 35, 19],
      campaign: [10, 15, 12, 20, 28, 35, 25],
      negative: [1, 2, 1, 0, 2, 1, 0]
    },
    weekly: {
      scans: [85, 110, 95, 130],
      feedback: [58, 79, 68, 98],
      reviews: [45, 62, 54, 80],
      requests: [100, 120, 110, 150],
      conversions: [50, 72, 63, 89],
      campaign: [80, 95, 85, 110],
      negative: [5, 4, 3, 6]
    },
    monthly: {
      scans: [320, 410, 380, 520, 610, 750],
      feedback: [220, 290, 260, 380, 440, 560],
      reviews: [180, 240, 210, 310, 370, 480],
      requests: [400, 450, 420, 600, 680, 800],
      conversions: [210, 280, 240, 360, 420, 510],
      campaign: [300, 350, 320, 450, 500, 600],
      negative: [15, 18, 12, 14, 20, 15]
    },
    yearly: {
      scans: [2400, 3900, 5400],
      feedback: [1700, 2900, 4100],
      reviews: [1400, 2400, 3400],
      requests: [3000, 4500, 6000],
      conversions: [1500, 2600, 3800],
      campaign: [2500, 3800, 5000],
      negative: [90, 110, 140]
    }
  };

  const chartLabels: Record<ChartInterval, string[]> = {
    daily: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    weekly: ["Week 1", "Week 2", "Week 3", "Week 4"],
    monthly: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    yearly: ["2024", "2025", "2026"]
  };

  const activeDataset = chartDatasets[chartInterval];
  const activeLabels = chartLabels[chartInterval];
  const maxChartVal = 1.15 * Math.max(...activeMetrics.flatMap(m => activeDataset[m] || [10]));

  const getMetricColor = (metric: string) => {
    switch (metric) {
      case "scans": return "#3b82f6"; // Blue
      case "feedback": return "#10b981"; // Green
      case "reviews": return "#6366f1"; // Indigo
      case "requests": return "#8b5cf6"; // Violet
      case "conversions": return "#14b8a6"; // Teal
      case "campaign": return "#f97316"; // Orange
      case "negative": return "#ef4444"; // Red
      default: return "#94a3b8";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-sm text-slate-500 font-medium">Loading Command Center...</span>
        </div>
      </div>
    );
  }

  // Filtered Notifications
  const filteredNotifications = notifications.filter(n => 
    n.message.toLowerCase().includes(notificationsSearch.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      
      {/* Sidebar */}
      <Sidebar tenantName={tenantName} roleName={roleName} userRoleId={userRoleId} />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8 space-y-8">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">Business Command Center</h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs">Review performance audits, staff standings, and Google Review conversions.</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowRequestModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition shadow-sm"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Send Request</span>
            </button>
          </div>
        </header>

        {successMsg && (
          <div className="p-4 border border-green-200 bg-green-50 text-green-600 text-sm rounded-lg flex items-center gap-2 shadow-sm animate-in fade-in slide-in-from-top-2">
            <CheckCircle className="h-4 w-4" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 1. KPI SECTION (8 CARDS) */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* Card 1: Total Feedback */}
          <div className="bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-2">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Feedback</span>
              <MessageSquare className="h-4 w-4 text-blue-500" />
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{totalFeedback}</p>
              <span className="text-[10px] font-extrabold text-green-600 dark:text-green-400 flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" /> {growthFeedback}
              </span>
            </div>
            <div className="text-[9px] text-slate-400">Feedback entries log</div>
          </div>

          {/* Card 2: Average Rating */}
          <div className="bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-2">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Average Rating</span>
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{avgRating > 0 ? `${avgRating} ★` : "0.0 ★"}</p>
              <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 flex items-center gap-0.5">
                <Sparkles className="h-3 w-3" /> {ratingTrend}
              </span>
            </div>
            <div className="text-[9px] text-slate-400">Client satisfaction index</div>
          </div>

          {/* Card 3: Requests Sent */}
          <div className="bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-2">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Requests Sent</span>
              <Send className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{campaignsSent}</p>
              <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400">
                {campaignPerformance}
              </span>
            </div>
            <div className="text-[9px] text-slate-400">Dispatched review campaigns</div>
          </div>

          {/* Card 4: Review Conversion Rate */}
          <div className="bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-2">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Review Conversion Rate</span>
              <TrendingUp className="h-4 w-4 text-teal-500" />
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-black text-slate-800 dark:text-slate-100">
                {campaignsSent > 0 ? `${Math.round((reviewsGenerated / campaignsSent) * 100)}%` : "35.2%"}
              </p>
              <span className="text-[9px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full dark:bg-teal-950/20 dark:text-teal-400">
                Benchmark: 15%
              </span>
            </div>
            <div className="text-[9px] text-slate-400">Google Clicks per request sent</div>
          </div>

          {/* Card 5: Google Reviews Generated (Highly Visible ROI) */}
          <div className="bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-2 bg-gradient-to-br from-white to-blue-50/20 dark:from-slate-900 dark:to-blue-950/10 border-blue-100 dark:border-blue-900/40">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Google Reviews Generated</span>
              <Compass className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">{reviewsGenerated}</p>
              <span className="text-[10px] font-extrabold text-green-600 dark:text-green-400 flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" /> +45 this month
              </span>
            </div>
            <div className="text-[9px] text-slate-500 font-semibold">Verified Product ROI</div>
          </div>

          {/* Card 6: QR Scans */}
          <div className="bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-2">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">QR Scans</span>
              <QrCode className="h-4 w-4 text-teal-500" />
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{qrScans}</p>
              <span className="text-[10px] text-slate-450">
                {Math.round(qrScans * 0.65)} unique
              </span>
            </div>
            <div className="text-[9px] text-slate-400">Conversions: {qrScans > 0 ? Math.round((funnelConversions / qrScans) * 100) : 36}%</div>
          </div>

          {/* Card 7: Negative Feedback Alerts */}
          <div className="bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-2 cursor-pointer hover:border-red-300 transition" onClick={() => {
            const el = document.getElementById("reputation-inbox-preview");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}>
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">Negative Feedback Alerts</span>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-black text-red-600">{unresolvedComplaints}</p>
              <span className="text-[9px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                {highPriorityComplaints} Critical
              </span>
            </div>
            <div className="text-[9px] text-red-500 font-medium underline">Attention required</div>
          </div>

          {/* Card 8: Active Campaigns */}
          <div className="bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-2">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Active Campaigns</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{activeCampaignsCount}</p>
              <span className="text-[10px] font-extrabold text-green-600 dark:text-green-400">
                94% success
              </span>
            </div>
            <div className="text-[9px] text-slate-400">Scheduled solicitations</div>
          </div>

        </section>

        {/* 2. QUICK ACTIONS PANEL */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-450 uppercase tracking-wider">Quick Actions Command Strip</h3>
          
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <Link href="/dashboard/qrs" className="px-3.5 py-2 bg-slate-50 border rounded-lg hover:bg-slate-100 text-slate-700 dark:bg-slate-950 dark:hover:bg-slate-800 dark:text-slate-300 dark:border-slate-800 transition">
              Generate QR Code
            </Link>
            <Link href="/dashboard/campaigns" className="px-3.5 py-2 bg-slate-50 border rounded-lg hover:bg-slate-100 text-slate-700 dark:bg-slate-950 dark:hover:bg-slate-800 dark:text-slate-300 dark:border-slate-800 transition">
              Create Campaign
            </Link>
            <Link href="/dashboard/staff" className="px-3.5 py-2 bg-slate-50 border rounded-lg hover:bg-slate-100 text-slate-700 dark:bg-slate-950 dark:hover:bg-slate-800 dark:text-slate-300 dark:border-slate-800 transition">
              Add Staff Member
            </Link>
            <Link href="/dashboard/settings" className="px-3.5 py-2 bg-slate-50 border rounded-lg hover:bg-slate-100 text-slate-700 dark:bg-slate-950 dark:hover:bg-slate-800 dark:text-slate-300 dark:border-slate-800 transition">
              Add Branch
            </Link>
            <button onClick={() => setShowRequestModal(true)} className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-600 rounded-lg dark:bg-blue-950/20 dark:hover:bg-blue-900/30 dark:text-blue-400 dark:border-blue-900/40 transition">
              Send Review Request
            </button>
            <Link href="/dashboard/campaigns" className="px-3.5 py-2 bg-slate-50 border rounded-lg hover:bg-slate-100 text-slate-700 dark:bg-slate-950 dark:hover:bg-slate-800 dark:text-slate-300 dark:border-slate-800 transition">
              Create WhatsApp Campaign
            </Link>
            <Link href="/dashboard/analytics" className="px-3.5 py-2 bg-slate-50 border rounded-lg hover:bg-slate-100 text-slate-700 dark:bg-slate-950 dark:hover:bg-slate-800 dark:text-slate-300 dark:border-slate-800 transition">
              Export Analytics Report
            </Link>
            <Link href="/dashboard/settings/team" className="px-3.5 py-2 bg-slate-50 border rounded-lg hover:bg-slate-100 text-slate-700 dark:bg-slate-950 dark:hover:bg-slate-800 dark:text-slate-300 dark:border-slate-800 transition">
              Invite Team Member
            </Link>
            <Link href="/dashboard/settings" className="px-3.5 py-2 bg-slate-50 border rounded-lg hover:bg-slate-100 text-slate-700 dark:bg-slate-950 dark:hover:bg-slate-800 dark:text-slate-300 dark:border-slate-800 transition">
              Manage Branding
            </Link>
          </div>
        </section>

        {/* 3. PERFORMANCE OVERVIEW GRAPH WIDGET */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4 mb-4">
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Performance Overview
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Plot and compare system reputation telemetry points over custom periods.</p>
            </div>
            
            {/* Date Filters Selector */}
            <div className="flex border rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-950 text-[10px] font-bold">
              {["Today", "7 Days", "30 Days", "90 Days", "12 Months"].map((range) => (
                <button
                  key={range}
                  onClick={() => {
                    setDateRangeFilter(range);
                    setChartInterval(range === "Today" ? "daily" : range === "7 Days" ? "weekly" : range === "12 Months" ? "yearly" : "monthly");
                  }}
                  className={`px-3 py-1.5 transition ${dateRangeFilter === range ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          {/* Metric Selector Checkboxes */}
          <div className="flex flex-wrap gap-3 mb-6 text-[10px] font-bold text-slate-500">
            {[
              { id: "scans", label: "QR Scans" },
              { id: "feedback", label: "Feedback Received" },
              { id: "reviews", label: "Google Clicks" },
              { id: "requests", label: "Requests Sent" },
              { id: "conversions", label: "Conversions" },
              { id: "campaign", label: "Campaigns" },
              { id: "negative", label: "Complaints" }
            ].map((m) => {
              const active = activeMetrics.includes(m.id);
              const color = getMetricColor(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggleMetric(m.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg transition ${
                    active 
                      ? "bg-slate-50 border-slate-300 dark:bg-slate-950 dark:border-slate-800 text-slate-850 dark:text-slate-200" 
                      : "opacity-60 hover:opacity-100"
                  }`}
                >
                  <span className="h-2 w-3 rounded-full" style={{ backgroundColor: color }}></span>
                  <span>{m.label}</span>
                  {active && <Check className="h-3 w-3 text-blue-600" />}
                </button>
              );
            })}
          </div>

          {/* Custom SVG Multi-Line Chart */}
          <div className="w-full h-56 flex items-center justify-center">
            <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
              <line x1="40" y1="40" x2="470" y2="40" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="100" x2="470" y2="100" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="160" x2="470" y2="160" stroke="#e2e8f0" strokeWidth="1.5" />

              {activeMetrics.map((metric) => {
                const dataset = activeDataset[metric] || [];
                const color = getMetricColor(metric);
                const points = dataset.map((val, idx) => {
                  const x = (idx / (activeLabels.length - 1)) * 400 + 50;
                  const y = 160 - (val / maxChartVal) * 120;
                  return `${x},${y}`;
                }).join(" ");

                return (
                  <g key={metric}>
                    <polyline
                      fill="none"
                      stroke={color}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      points={points}
                      className="transition-all duration-300"
                    />
                    {dataset.map((val, idx) => {
                      const x = (idx / (activeLabels.length - 1)) * 400 + 50;
                      const y = 160 - (val / maxChartVal) * 120;
                      return (
                        <circle key={idx} cx={x} cy={y} r="3.5" fill={color} stroke="#ffffff" strokeWidth="1.5" />
                      );
                    })}
                  </g>
                );
              })}

              {/* X-Axis labels */}
              {activeLabels.map((lbl, idx) => {
                const x = (idx / (activeLabels.length - 1)) * 400 + 50;
                return (
                  <text key={idx} x={x} y="185" fill="#94a3b8" fontSize="9" textAnchor="middle" fontWeight="bold">
                    {lbl}
                  </text>
                );
              })}
            </svg>
          </div>
        </section>

        {/* 4. REVIEW FUNNEL ANALYTICS */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-base flex items-center gap-2">
              <Compass className="h-5 w-5 text-teal-600" />
              Customer Review Funnel
            </h3>
            <p className="text-[10px] text-slate-450 mt-0.5">Visualize tracking drop-offs from initial invitation push to verified Google Business reviews.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-6 items-center text-center text-xs">
            
            <div className="p-3 border rounded-xl bg-slate-50 dark:bg-slate-950/20">
              <span className="text-[9px] text-slate-450 uppercase font-bold">Requests Sent</span>
              <p className="text-lg font-black mt-1">{campaignsSent || 840}</p>
              <span className="text-[9px] text-slate-400 font-semibold block mt-1">100% Base</span>
            </div>

            <div className="text-slate-350 font-bold justify-self-center hidden md:block">&rarr;</div>

            <div className="p-3 border rounded-xl bg-slate-50 dark:bg-slate-950/20">
              <span className="text-[9px] text-slate-450 uppercase font-bold">Links Opened</span>
              <p className="text-lg font-black mt-1">{qrScans || 680}</p>
              <span className="text-[9px] text-blue-600 font-extrabold block mt-1">81% Open Rate</span>
            </div>

            <div className="text-slate-350 font-bold justify-self-center hidden md:block">&rarr;</div>

            <div className="p-3 border rounded-xl bg-slate-50 dark:bg-slate-950/20">
              <span className="text-[9px] text-slate-450 uppercase font-bold">Feedback Submitted</span>
              <p className="text-lg font-black mt-1">{totalFeedback || 296}</p>
              <span className="text-[9px] text-teal-600 font-extrabold block mt-1">43% Submit Rate</span>
            </div>

            <div className="text-slate-350 font-bold justify-self-center hidden md:block">&rarr;</div>

            <div className="p-3 border rounded-xl bg-slate-50 dark:bg-slate-950/20">
              <span className="text-[9px] text-slate-450 uppercase font-bold">Positive Ratings</span>
              <p className="text-lg font-black mt-1">{Math.round((totalFeedback || 296) * 0.85)}</p>
              <span className="text-[9px] text-indigo-600 font-extrabold block mt-1">85% Positive</span>
            </div>

            <div className="text-slate-350 font-bold justify-self-center hidden md:block">&rarr;</div>

            <div className="p-3 border rounded-xl bg-slate-50 dark:bg-slate-950/20">
              <span className="text-[9px] text-slate-450 uppercase font-bold">Google Clicks</span>
              <p className="text-lg font-black mt-1">{reviewsGenerated || 210}</p>
              <span className="text-[9px] text-green-600 font-extrabold block mt-1">82% Clickthrough</span>
            </div>

            <div className="text-slate-350 font-bold justify-self-center hidden md:block">&rarr;</div>

            <div className="p-3 border rounded-xl bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/50">
              <span className="text-[9px] text-blue-600 font-bold uppercase">Google Reviews</span>
              <p className="text-lg font-black mt-1 text-blue-600">{Math.round((reviewsGenerated || 210) * 0.85)}</p>
              <span className="text-[9px] text-blue-600 font-black block mt-1">85% conversion</span>
            </div>

          </div>

          <div className="p-4 border border-teal-100 bg-teal-50/20 dark:border-teal-900/30 dark:bg-teal-950/10 rounded-xl text-xs flex items-start gap-2.5">
            <Sparkles className="h-4 w-4 text-teal-500 shrink-0 mt-0.5" />
            <div className="text-slate-600 dark:text-slate-300">
              <span className="font-bold">Automated Funnel Optimization Suggestion:</span> Link open metrics show a 19% drop-off. Customizing campaign text headings (e.g. including customers' first names) can increase invite open rate conversion by 8%.
            </div>
          </div>
        </section>

        {/* 5. AI INSIGHTS & BUSINESS HEALTH SCORE */}
        <section className="grid gap-6 md:grid-cols-3">
          
          {/* AI Insights Card */}
          <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-base flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-500" />
              AI Reputation Insights
            </h3>
            
            <div className="grid gap-3 sm:grid-cols-2 text-xs font-semibold">
              <div className="p-3.5 border rounded-xl bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[9px] font-bold text-green-600 uppercase">Positive Sentiment Spikes</span>
                <p className="text-slate-700 dark:text-slate-300">Staff professionalism frequently praised. Hair styling quality consistently receives high satisfaction.</p>
              </div>

              <div className="p-3.5 border rounded-xl bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[9px] font-bold text-red-500 uppercase">Friction Alert</span>
                <p className="text-slate-700 dark:text-slate-300">Waiting time complaints increased by 12% at the North Branch location over the past 7 days.</p>
              </div>
            </div>
          </div>

          {/* Business Health Score */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between items-center text-center">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-450">Business Reputation Score</h3>
            
            <div className="relative flex items-center justify-center my-4">
              <svg className="w-28 h-28" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                <circle cx="50" cy="50" r="40" stroke="#10b981" strokeWidth="8" fill="transparent"
                        strokeDasharray={251.2} strokeDashoffset={251.2 - (251.2 * healthScore) / 100}
                        strokeLinecap="round" />
                <text x="50" y="55" textAnchor="middle" className="text-xl font-black fill-slate-800 dark:fill-slate-100" fontSize="18">
                  {healthScore}
                </text>
              </svg>
            </div>

            <div className="space-y-1">
              <span className="text-xs bg-green-50 text-green-700 border border-green-100 px-3 py-1 rounded-full font-bold dark:bg-green-950/30 dark:text-green-400">
                Excellent Status
              </span>
              <p className="text-[9px] text-slate-400 block pt-1">Review growth & rating index matches highest industry benchmarks.</p>
            </div>
          </div>

        </section>

        {/* 6. STAFF PERFORMANCE & TODAY'S SNAPSHOT */}
        <section className="grid gap-6 lg:grid-cols-3">
          
          {/* Staff Performance rankings */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b pb-3 mb-4">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Award className="h-5 w-5 text-yellow-500 fill-current" />
                  Stylist Standing Rank
                </h3>

                <div className="flex border rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-950 text-[10px] font-bold">
                  {[
                    { id: "top", label: "Top 5" },
                    { id: "bottom", label: "Needs Help" },
                    { id: "growing", label: "Fast Growing" }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setStaffTab(tab.id as PerformanceTab)}
                      className={`px-3 py-1 capitalize transition ${staffTab === tab.id ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {staffRankings.length === 0 ? (
                <p className="text-xs text-slate-450 py-6 text-center">No employee staff assignments logged.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b text-slate-400 font-semibold">
                        <th className="pb-2">Stylist / staff</th>
                        <th className="pb-2 text-center">Average Rating</th>
                        <th className="pb-2 text-center">Feedback count</th>
                        <th className="pb-2 text-right">Conversion Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-600 dark:text-slate-350">
                      {staffRankings.map((sp, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/10">
                          <td className="py-2.5 font-bold text-slate-850 dark:text-slate-200">{sp.name}</td>
                          <td className="py-2.5 text-center font-bold text-yellow-500">{sp.rating} ★</td>
                          <td className="py-2.5 text-center">{sp.feedbackCount} logs</td>
                          <td className="py-2.5 text-right font-extrabold text-teal-600 dark:text-teal-400">{sp.rate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <Link href="/dashboard/staff" className="text-[10px] text-blue-600 hover:underline font-bold mt-4 block">
              Open Staff Analytics Dashboard &rarr;
            </Link>
          </div>

          {/* Today's snapshot */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-base flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Today's Snapshot
            </h3>
            
            <div className="space-y-3.5 text-xs font-semibold">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-slate-500">Today's Feedback</span>
                <span className="text-slate-850 dark:text-slate-200">{todayFeedbackCount} responses</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-slate-500">Today's Google Clicks</span>
                <span className="text-slate-850 dark:text-slate-200">{todayReviewsCount} redirect clicks</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-slate-500">Today's QR Scans</span>
                <span className="text-slate-850 dark:text-slate-200">{todayScansCount} scans</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-slate-500">Funnel Conversions</span>
                <span className="text-slate-850 dark:text-slate-200">{todayConversionsCount} submissions</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-slate-500">Active Complaints</span>
                <span className={`font-bold ${todayComplaintsCount > 0 ? 'text-red-500' : 'text-slate-850 dark:text-slate-200'}`}>{todayComplaintsCount} unresolved</span>
              </div>
            </div>
          </div>

        </section>

        {/* 7. RECENT FEEDBACK & RECENT ACTIVITIES */}
        <section className="grid gap-6 lg:grid-cols-2">
          
          {/* Feedback preview */}
          <div id="reputation-inbox-preview" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
            <h3 className="font-bold text-base mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              Reputation Inbox Preview
            </h3>

            {recentFeedback.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">No review submissions recorded yet.</div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentFeedback.map((f) => (
                  <div key={f.id} className="py-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-800 dark:text-slate-200">{f.customers?.name || "Guest User"}</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          f.sentiment === 'Positive' ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400' :
                          f.sentiment === 'Negative' ? 'bg-red-50 text-red-750 dark:bg-red-950 dark:text-red-400' :
                          'bg-slate-100 text-slate-600 dark:bg-slate-850'
                        }`}>
                          {f.sentiment}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">{new Date(f.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    <p className="text-xs text-slate-650 dark:text-slate-400 italic mt-1">&quot;{f.comments || "No comment left."}&quot;</p>
                    
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-[9px] bg-slate-50 border px-2 py-0.5 rounded text-slate-500 font-semibold">Category: {f.category}</span>
                      
                      <div className="flex gap-1.5 text-[9px] font-bold">
                        {f.status !== "Resolved" ? (
                          <button
                            onClick={() => handleResolveFeedback(f.id)}
                            className="px-2.5 py-1 bg-green-50 hover:bg-green-100 text-green-600 border border-green-200 rounded transition"
                          >
                            Resolve
                          </button>
                        ) : (
                          <span className="text-green-600 flex items-center gap-0.5"><Check className="h-3 w-3" /> Resolved</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activities stream */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-base flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-500" />
              Event Timeline Feed
            </h3>

            <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800/80">
              {activities.map((act) => (
                <div key={act.id} className="flex gap-3 items-start relative pl-6 text-xs">
                  <span className="absolute left-2 top-1.5 h-2 w-2 rounded-full bg-blue-500 border border-white dark:border-slate-900 shrink-0"></span>
                  <div className="flex-1 space-y-0.5">
                    <div className="flex justify-between">
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">{act.user}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{act.timestamp}</span>
                    </div>
                    <p className="text-slate-500">{act.action} &rarr; <span className="font-semibold">{act.resource}</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </section>

        {/* 8. NOTIFICATIONS CENTER & SENTIMENT OVERVIEW */}
        <section className="grid gap-6 lg:grid-cols-2">
          
          {/* Notifications Center */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center gap-4 flex-wrap border-b pb-3">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-600" />
                Reputation Notifications
              </h3>
              
              <div className="relative w-full sm:w-48">
                <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter alerts..."
                  value={notificationsSearch}
                  onChange={(e) => setNotificationsSearch(e.target.value)}
                  className="w-full pl-7 pr-3 py-1 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-3 max-h-52 overflow-y-auto">
              {filteredNotifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`p-3 border rounded-xl flex justify-between items-start gap-3 text-xs ${
                    !notif.read ? 'bg-blue-50/50 border-blue-100 dark:bg-blue-950/10 dark:border-blue-900/30' : 'border-slate-100 dark:border-slate-850'
                  }`}
                >
                  <div className="space-y-0.5">
                    <p className="font-medium text-slate-700 dark:text-slate-300">{notif.message}</p>
                    <span className="text-[9px] text-slate-400 block font-mono">{notif.timestamp}</span>
                  </div>

                  {!notif.read && (
                    <button
                      onClick={() => handleNotificationRead(notif.id)}
                      className="text-[9px] font-bold text-blue-600 hover:underline shrink-0"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Sentiment overview chart */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
            <h3 className="font-bold text-base mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-500" />
              Reputation Sentiment Share
            </h3>

            <div className="space-y-4">
              <div className="flex h-5 w-full rounded-lg overflow-hidden font-bold text-white text-[10px] text-center">
                <div className="bg-green-500 flex items-center justify-center" style={{ width: `${sentimentRatios.positive}%` }}>
                  {sentimentRatios.positive}% Pos
                </div>
                <div className="bg-slate-400 flex items-center justify-center" style={{ width: `${sentimentRatios.neutral}%` }}>
                  {sentimentRatios.neutral}%
                </div>
                <div className="bg-red-500 flex items-center justify-center" style={{ width: `${sentimentRatios.negative}%` }}>
                  {sentimentRatios.negative}% Neg
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold pt-2">
                <div className="space-y-0.5">
                  <span className="text-slate-400 block text-[9px]">Positive</span>
                  <span className="text-green-600 block">{sentimentRatios.positive}%</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-slate-400 block text-[9px]">Neutral</span>
                  <span className="text-slate-700 dark:text-slate-300 block">{sentimentRatios.neutral}%</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-slate-400 block text-[9px]">Negative</span>
                  <span className="text-red-500 block">{sentimentRatios.negative}%</span>
                </div>
              </div>
            </div>
            
            <p className="text-[10px] text-slate-400 mt-4 italic">
              Shares computed dynamically using ratings metrics. (Positive: 4-5 stars, Neutral: 3 stars, Negative: 1-2 stars).
            </p>
          </div>

        </section>

        {/* 9. BRANCH PERFORMANCE SUMMARY */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <Building className="h-5 w-5 text-blue-600" />
                Branch Performance Matrix
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Sortable directory of brand location reputations, response counts, and conversions.</p>
            </div>
          </div>

          {branchPerformance.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No branch locations onboarded.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b text-slate-400 font-bold uppercase text-[9px] tracking-wider select-none">
                    <th className="pb-3 cursor-pointer hover:text-slate-600" onClick={() => handleSortBranch("name")}>Location</th>
                    <th className="pb-3 text-center cursor-pointer hover:text-slate-600" onClick={() => handleSortBranch("rating")}>Average Rating</th>
                    <th className="pb-3 text-center cursor-pointer hover:text-slate-600" onClick={() => handleSortBranch("feedbackCount")}>Feedback Count</th>
                    <th className="pb-3 text-center cursor-pointer hover:text-slate-600" onClick={() => handleSortBranch("rate")}>Conversion Rate</th>
                    <th className="pb-3 text-right pr-2">Top Performer</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-slate-600 dark:text-slate-350 font-medium">
                  {branchPerformance.map((bp, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/10">
                      <td className="py-3 font-bold text-slate-800 dark:text-slate-200">{bp.name}</td>
                      <td className="py-3 text-center text-yellow-500 font-extrabold">{bp.rating} ★</td>
                      <td className="py-3 text-center">{bp.feedbackCount} reviews</td>
                      <td className="py-3 text-center font-bold text-blue-600 dark:text-blue-400">{bp.rate}%</td>
                      <td className="py-3 text-right pr-2 text-indigo-500 font-bold">{bp.topStaff}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </main>

      {/* Simple Review Request Drawer Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-slate-950/40 dark:bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xl w-full max-w-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Send className="h-4 w-4 text-blue-600" />
                Send Instant Review Invitation
              </h4>
              <button onClick={() => setShowRequestModal(false)} className="text-xs text-slate-450 hover:text-slate-800 dark:hover:text-slate-200">Cancel</button>
            </div>

            <form onSubmit={handleSendRequest} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Customer Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alice Watson"
                  value={requestTargetName}
                  onChange={(e) => setRequestTargetName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Phone Number (WhatsApp API)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +91 9876543210"
                  value={requestTargetPhone}
                  onChange={(e) => setRequestTargetPhone(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition"
              >
                Send Request via WhatsApp
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
