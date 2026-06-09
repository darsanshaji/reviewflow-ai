"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  BarChart3, Loader2, Star, ShieldCheck, MapPin, Users, QrCode, 
  ArrowUpRight, Clock, LayoutDashboard, MessageSquare, ClipboardList, 
  AlertCircle, TrendingUp, TrendingDown, ArrowRight, Download, Send, 
  Globe, Heart, ShieldAlert, Sparkles, HelpCircle, Calendar, RefreshCw, 
  AlertTriangle, Filter, CheckCircle, FileSpreadsheet, FileText, Mail, 
  ChevronRight, Smile, Meh, Frown, Compass, Check, UserCheck, Shield
} from "lucide-react";
import Sidebar from "@/components/Sidebar";

interface EventLog {
  id: string;
  event_type: string;
  metadata: any;
  created_at: string;
  actor?: string;
  status?: string;
  affected_resource?: string;
}

interface FeedbackItem {
  id: string;
  rating: number;
  comments: string;
  category: string;
  sentiment: string;
  priority: string;
  branch_id: string;
  branch_name: string;
  staff_id: string;
  staff_name: string;
  created_at: string;
  customer_name?: string;
  customer_cohort?: string;
  city?: string;
  region?: string;
  country?: string;
}

export default function PerformanceAnalyticsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  // Context State
  const [tenantName, setTenantName] = useState("My Business");
  const [roleName, setRoleName] = useState("Staff");
  const [userRoleId, setUserRoleId] = useState<number | null>(null);
  const [tenantId, setTenantId] = useState<string>("");

  // Tab State
  const [activeTab, setActiveTab] = useState<"bi" | "competitor">("bi");

  // Real Database State
  const [dbBranches, setDbBranches] = useState<any[]>([]);
  const [dbStaff, setDbStaff] = useState<any[]>([]);
  const [dbCampaigns, setDbCampaigns] = useState<any[]>([]);
  const [dbQrs, setDbQrs] = useState<any[]>([]);
  const [dbFeedback, setDbFeedback] = useState<FeedbackItem[]>([]);
  const [dbEvents, setDbEvents] = useState<EventLog[]>([]);

  // Filter States
  const [timeRange, setTimeRange] = useState<string>("30D");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [selectedBranch, setSelectedBranch] = useState<string>("All");
  const [selectedStaff, setSelectedStaff] = useState<string>("All");
  const [selectedCampaign, setSelectedCampaign] = useState<string>("All");
  const [selectedQR, setSelectedQR] = useState<string>("All");
  const [selectedRating, setSelectedRating] = useState<string>("All");
  const [selectedSentiment, setSelectedSentiment] = useState<string>("All");

  // Demo Sandbox State
  const [demoMode, setDemoMode] = useState<boolean>(false);

  // Growth Chart Toggles: "none", "branch", "campaign", "staff"
  const [chartComparison, setChartComparison] = useState<string>("none");

  // Table Sorting States
  const [branchSortKey, setBranchSortKey] = useState<string>("rating");
  const [branchSortAsc, setBranchSortAsc] = useState<boolean>(false);
  const [staffSortKey, setStaffSortKey] = useState<string>("conversions");
  const [staffSortAsc, setStaffSortAsc] = useState<boolean>(false);
  const [campaignSortKey, setCampaignSortKey] = useState<string>("rate");
  const [campaignSortAsc, setCampaignSortAsc] = useState<boolean>(false);
  const [qrSortKey, setQrSortKey] = useState<string>("rate");
  const [qrSortAsc, setQrSortAsc] = useState<boolean>(false);

  // Trigger brief toast notifications
  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

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

        let activeTenantId = profile?.tenant_id;
        let tenantNameVal = profile?.tenants?.name || "My Business";
        let roleNameVal = profile?.roles?.name || "Staff";
        let userRoleIdVal = profile?.role_id;

        if (typeof window !== "undefined") {
          const impId = sessionStorage.getItem("impersonate_tenant_id");
          const impName = sessionStorage.getItem("impersonate_tenant_name");
          if (impId && impName) {
            activeTenantId = impId;
            tenantNameVal = impName;
            roleNameVal = "Owner (Impersonated)";
            userRoleIdVal = 2;
          }
        }

        if (!activeTenantId) {
          setErrorMsg("Tenant profile context missing.");
          setLoading(false);
          return;
        }

        setTenantId(activeTenantId);
        setTenantName(tenantNameVal);
        setRoleName(roleNameVal);
        setUserRoleId(userRoleIdVal);

        // Fetch actual DB records
        const { data: campaigns } = await supabase
          .from("campaigns")
          .select("id, name, type, status, created_at")
          .eq("tenant_id", activeTenantId);

        const { data: feedback } = await supabase
          .from("feedback")
          .select("id, rating, comments, category, sentiment, priority, branch_id, staff_id, service_id, created_at")
          .eq("tenant_id", activeTenantId);

        const { data: events } = await supabase
          .from("analytics_events")
          .select("id, event_type, metadata, created_at")
          .eq("tenant_id", activeTenantId)
          .order("created_at", { ascending: false });

        const { data: staff } = await supabase
          .from("staff")
          .select("id, name, branch_id, role, email, phone")
          .eq("tenant_id", activeTenantId);

        const { data: branches } = await supabase
          .from("branches")
          .select("id, name, address, google_review_url")
          .eq("tenant_id", activeTenantId);

        const { data: qrs } = await supabase
          .from("qr_codes")
          .select("id, target_type, target_id, branch_id, staff_id, service_id, created_at")
          .eq("tenant_id", activeTenantId);

        setDbCampaigns(campaigns || []);
        setDbStaff(staff || []);
        setDbBranches(branches || []);
        setDbQrs(qrs || []);
        setDbEvents(events || []);

        const mappedFeedback: FeedbackItem[] = (feedback || []).map((f) => {
          const matchingBranch = (branches || []).find(b => b.id === f.branch_id);
          const matchingStaff = (staff || []).find(s => s.id === f.staff_id);
          return {
            id: f.id,
            rating: f.rating,
            comments: f.comments || "",
            category: f.category || "Other",
            sentiment: f.sentiment || "Neutral",
            priority: f.priority || "Medium",
            branch_id: f.branch_id,
            branch_name: matchingBranch ? matchingBranch.name : "Unknown Branch",
            staff_id: f.staff_id,
            staff_name: matchingStaff ? matchingStaff.name : "General Staff",
            created_at: f.created_at
          };
        });
        setDbFeedback(mappedFeedback);

        // If real DB has no feedback reviews, default automatically to Sandbox Demo Mode
        if (mappedFeedback.length === 0) {
          setDemoMode(true);
          triggerToast("Entering Sandbox Demo Mode: Loaded rich demonstration analytics.");
        }

      } catch (err) {
        setErrorMsg("Failed to compile analytics aggregations.");
      } finally {
        setLoading(false);
      }
    }
    loadAnalyticsData();
  }, [router, supabase]);

  // Construct massive, high-fidelity Sandbox Mock Data
  const sandboxData = useMemo(() => {
    const mockBranches = [
      { id: "sb-b1", name: "Downtown Flagship", address: "101 Main St", google_review_url: "https://google.com" },
      { id: "sb-b2", name: "Plaza Mall Branch", address: "Suite 400, Plaza Mall", google_review_url: "https://google.com" },
      { id: "sb-b3", name: "Airport Terminal Lounge", address: "Gate B14 Departure", google_review_url: "https://google.com" }
    ];

    const mockStaff = [
      { id: "sb-s1", name: "Emma Watson", branch_id: "sb-b1", role: "Senior Stylist", email: "emma@flow.ai" },
      { id: "sb-s2", name: "James Smith", branch_id: "sb-b1", role: "Therapist", email: "james@flow.ai" },
      { id: "sb-s3", name: "Sophia Patel", branch_id: "sb-b2", role: "Senior Stylist", email: "sophia@flow.ai" },
      { id: "sb-s4", name: "David Miller", branch_id: "sb-b2", role: "Stylist", email: "david@flow.ai" },
      { id: "sb-s5", name: "Chloe Young", branch_id: "sb-b3", role: "Receptionist", email: "chloe@flow.ai" }
    ];

    const mockCampaigns = [
      { id: "sb-c1", name: "Summer Loyalty Blast", type: "WhatsApp", status: "Sent", created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString() },
      { id: "sb-c2", name: "Post-Service Auto SMS", type: "SMS", status: "Sent", created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString() },
      { id: "sb-c3", name: "Feedback Email Campaign", type: "Email", status: "Sent", created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
      { id: "sb-c4", name: "Spring Re-engagement", type: "WhatsApp", status: "Draft", created_at: new Date().toISOString() }
    ];

    const mockQrs = [
      { id: "sb-q1", name: "Front Desk QR", target_type: "Branch", target_id: "sb-b1", branch_id: "sb-b1", staff_id: "sb-s1", created_at: new Date().toISOString() },
      { id: "sb-q2", name: "Emma Watson Standee QR", target_type: "Staff", target_id: "sb-s1", branch_id: "sb-b1", staff_id: "sb-s1", created_at: new Date().toISOString() },
      { id: "sb-q3", name: "Plaza Counter QR", target_type: "Branch", target_id: "sb-b2", branch_id: "sb-b2", staff_id: "sb-s3", created_at: new Date().toISOString() },
      { id: "sb-q4", name: "Table 4 QR Card", target_type: "Branch", target_id: "sb-b3", branch_id: "sb-b3", staff_id: "sb-s5", created_at: new Date().toISOString() }
    ];

    const mockComments = [
      { text: "Amazing service! Emma was extremely professional and did a wonderful job.", rating: 5, category: "Staff Behavior", sentiment: "Positive" },
      { text: "The salon was clean and sanitization practices were excellent.", rating: 5, category: "Cleanliness", sentiment: "Positive" },
      { text: "Had to wait 20 minutes past my appointment time. Frustrating.", rating: 2, category: "Waiting Time", sentiment: "Negative" },
      { text: "Great experience, but pricing is a bit high compared to others.", rating: 3, category: "Pricing", sentiment: "Neutral" },
      { text: "Awesome service quality, love my new hair styling!", rating: 5, category: "Service Quality", sentiment: "Positive" },
      { text: "The chairs are super comfortable and the coffee was great.", rating: 4, category: "Facilities", sentiment: "Positive" },
      { text: "Communication about package details was slightly confusing.", rating: 3, category: "Communication", sentiment: "Neutral" },
      { text: "Average experience, nothing special but no complaints either.", rating: 3, category: "Other", sentiment: "Neutral" },
      { text: "Staff was polite, but they didn't follow the instructions fully.", rating: 3, category: "Staff Behavior", sentiment: "Neutral" },
      { text: "Terrible waiting time! I will not return.", rating: 1, category: "Waiting Time", sentiment: "Negative" },
      { text: "Sophia did an incredible job, highly recommend her!", rating: 5, category: "Staff Behavior", sentiment: "Positive" },
      { text: "The facilities looked a bit dated and needed dusting.", rating: 2, category: "Facilities", sentiment: "Negative" },
      { text: "Outstanding quality. Fast styling and super friendly team.", rating: 5, category: "Service Quality", sentiment: "Positive" },
      { text: "Reasonable cost, prompt styling session, clean tables.", rating: 4, category: "Cleanliness", sentiment: "Positive" }
    ];

    const cohorts = ["New Customers", "Returning Customers", "VIP Customers", "High Frequency Customers"];
    const customers = [
      { name: "Alice Jenkins" }, { name: "Michael Chang" }, { name: "Sarah Connor" },
      { name: "David Beck" }, { name: "Elena Rostova" }, { name: "Oliver Queen" },
      { name: "Bruce Wayne" }, { name: "Clara Oswald" }, { name: "John Watson" }
    ];

    const geographics = [
      { city: "New York", region: "Manhattan", country: "USA" },
      { city: "New York", region: "Brooklyn", country: "USA" },
      { city: "London", region: "Kensington", country: "UK" },
      { city: "London", region: "Soho", country: "UK" },
      { city: "Paris", region: "Montmartre", country: "France" },
      { city: "Tokyo", region: "Shibuya", country: "Japan" }
    ];

    const mockFeedback: FeedbackItem[] = [];
    const mockEvents: EventLog[] = [];
    const now = new Date();

    // Generate feedback spread over last 90 days
    for (let i = 0; i < 90; i++) {
      const daysAgo = i;
      const createdDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000 - Math.random() * 12 * 60 * 60 * 1000);
      
      // Generate 1 to 4 reviews per day
      const dailyCount = Math.floor(Math.random() * 4) + 1;
      for (let d = 0; d < dailyCount; d++) {
        const commentObj = mockComments[Math.floor(Math.random() * mockComments.length)];
        const staffObj = mockStaff[Math.floor(Math.random() * mockStaff.length)];
        const branchObj = mockBranches.find(b => b.id === staffObj.branch_id) || mockBranches[0];
        const custObj = customers[Math.floor(Math.random() * customers.length)];
        const cohort = cohorts[Math.floor(Math.random() * cohorts.length)];
        const geo = geographics[Math.floor(Math.random() * geographics.length)];
        
        mockFeedback.push({
          id: `sb-fb-${i}-${d}`,
          rating: commentObj.rating,
          comments: commentObj.text,
          category: commentObj.category,
          sentiment: commentObj.sentiment,
          priority: commentObj.rating <= 2 ? "High" : commentObj.rating === 3 ? "Medium" : "Low",
          branch_id: branchObj.id,
          branch_name: branchObj.name,
          staff_id: staffObj.id,
          staff_name: staffObj.name,
          customer_name: custObj.name,
          customer_cohort: cohort,
          city: geo.city,
          region: geo.region,
          country: geo.country,
          created_at: createdDate.toISOString()
        });

        // Associated event log entries for live stream
        if (d === 0) {
          mockEvents.push({
            id: `sb-ev-fb-${i}`,
            event_type: "feedback_submitted",
            metadata: { rating: commentObj.rating, branch: branchObj.name, category: commentObj.category },
            created_at: createdDate.toISOString(),
            actor: custObj.name,
            status: "Success",
            affected_resource: "Feedback Inbox"
          });
        }
      }

      // Add analytics funnel scans, link opens, clicks
      const scansDaily = Math.floor(Math.random() * 12) + 6;
      for (let s = 0; s < scansDaily; s++) {
        const qr = mockQrs[Math.floor(Math.random() * mockQrs.length)];
        const eventTime = new Date(createdDate.getTime() - Math.random() * 8 * 60 * 60 * 1000);
        
        mockEvents.push({
          id: `sb-ev-scan-${i}-${s}`,
          event_type: "qr_scan",
          metadata: { qr_id: qr.id, target: qr.name, branch_id: qr.branch_id },
          created_at: eventTime.toISOString(),
          actor: "Guest Customer",
          status: "Success",
          affected_resource: qr.name
        });

        mockEvents.push({
          id: `sb-ev-open-${i}-${s}`,
          event_type: "page_open",
          metadata: { source: "QR", device: Math.random() > 0.35 ? "Mobile" : "Desktop" },
          created_at: new Date(eventTime.getTime() + 2000).toISOString(),
          actor: "Guest Customer",
          status: "Success",
          affected_resource: "Funnel Landing"
        });

        if (Math.random() > 0.4) {
          mockEvents.push({
            id: `sb-ev-click-${i}-${s}`,
            event_type: "review_click",
            metadata: { platform: "Google" },
            created_at: new Date(eventTime.getTime() + 15000).toISOString(),
            actor: "Guest Customer",
            status: "Success",
            affected_resource: "Google Review Link"
          });
        }
      }
    }

    // Add static system audits into events for variety
    mockEvents.push({
      id: "sb-ev-system-1",
      event_type: "Staff Added",
      metadata: { name: "Chloe Young", role: "Receptionist" },
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      actor: "Owner",
      status: "Success",
      affected_resource: "Staff Roster"
    });
    mockEvents.push({
      id: "sb-ev-system-2",
      event_type: "Campaign Completed",
      metadata: { name: "Summer Loyalty Blast", type: "WhatsApp" },
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      actor: "Campaign Engine",
      status: "Completed",
      affected_resource: "WhatsApp API Client"
    });

    return {
      branches: mockBranches,
      staff: mockStaff,
      campaigns: mockCampaigns,
      qrs: mockQrs,
      feedback: mockFeedback,
      events: mockEvents
    };
  }, []);

  // Choose between Sandbox or Real Database
  const activeBranches = demoMode ? sandboxData.branches : dbBranches;
  const activeStaff = demoMode ? sandboxData.staff : dbStaff;
  const activeCampaigns = demoMode ? sandboxData.campaigns : dbCampaigns;
  const activeQrs = demoMode ? sandboxData.qrs : dbQrs;
  const activeFeedback = demoMode ? sandboxData.feedback : dbFeedback;
  const activeEvents = demoMode ? sandboxData.events : dbEvents;

  // Filter Helper: Checks if item is in selected date range
  const isInDateRange = (dateStr: string, range: string, start?: string, end?: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    if (range === "Today") {
      return d.toDateString() === now.toDateString();
    }
    if (range === "7D") {
      const limit = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return d >= limit;
    }
    if (range === "30D") {
      const limit = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return d >= limit;
    }
    if (range === "90D") {
      const limit = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      return d >= limit;
    }
    if (range === "12M") {
      const limit = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      return d >= limit;
    }
    if (range === "Custom" && start && end) {
      const s = new Date(start);
      const e = new Date(end);
      e.setHours(23, 59, 59, 999);
      return d >= s && d <= e;
    }
    return true;
  };

  // Filter Helper: Checks if item is in the previous duration period (for comparisons)
  const isInPreviousDateRange = (dateStr: string, range: string, start?: string, end?: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    if (range === "Today") {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      return d.toDateString() === yesterday.toDateString();
    }
    if (range === "7D") {
      const limitStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const limitEnd = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return d >= limitStart && d < limitEnd;
    }
    if (range === "30D") {
      const limitStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      const limitEnd = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return d >= limitStart && d < limitEnd;
    }
    if (range === "90D") {
      const limitStart = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      const limitEnd = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      return d >= limitStart && d < limitEnd;
    }
    if (range === "12M") {
      const limitStart = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);
      const limitEnd = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      return d >= limitStart && d < limitEnd;
    }
    if (range === "Custom" && start && end) {
      const s = new Date(start);
      const e = new Date(end);
      const diff = e.getTime() - s.getTime();
      const limitStart = new Date(s.getTime() - diff);
      const limitEnd = s;
      return d >= limitStart && d < limitEnd;
    }
    return false;
  };

  // Perform dynamic filtering based on selections
  const filteredFeedback = useMemo(() => {
    return activeFeedback.filter((f) => {
      // Date filter
      if (!isInDateRange(f.created_at, timeRange, customStartDate, customEndDate)) return false;
      // Branch filter
      if (selectedBranch !== "All" && f.branch_id !== selectedBranch) return false;
      // Staff filter
      if (selectedStaff !== "All" && f.staff_id !== selectedStaff) return false;
      // Rating filter
      if (selectedRating !== "All" && f.rating !== parseInt(selectedRating)) return false;
      // Sentiment filter
      if (selectedSentiment !== "All" && f.sentiment !== selectedSentiment) return false;
      return true;
    });
  }, [activeFeedback, timeRange, customStartDate, customEndDate, selectedBranch, selectedStaff, selectedRating, selectedSentiment]);

  const previousPeriodFeedback = useMemo(() => {
    return activeFeedback.filter((f) => {
      if (!isInPreviousDateRange(f.created_at, timeRange, customStartDate, customEndDate)) return false;
      if (selectedBranch !== "All" && f.branch_id !== selectedBranch) return false;
      if (selectedStaff !== "All" && f.staff_id !== selectedStaff) return false;
      if (selectedRating !== "All" && f.rating !== parseInt(selectedRating)) return false;
      if (selectedSentiment !== "All" && f.sentiment !== selectedSentiment) return false;
      return true;
    });
  }, [activeFeedback, timeRange, customStartDate, customEndDate, selectedBranch, selectedStaff, selectedRating, selectedSentiment]);

  // Apply filters on analytics events
  const filteredEvents = useMemo(() => {
    return activeEvents.filter((e) => {
      if (!isInDateRange(e.created_at, timeRange, customStartDate, customEndDate)) return false;
      if (selectedBranch !== "All" && e.metadata?.branch_id !== selectedBranch) return false;
      if (selectedStaff !== "All" && e.metadata?.staff_id !== selectedStaff) return false;
      if (selectedQR !== "All" && e.metadata?.qr_id !== selectedQR) return false;
      return true;
    });
  }, [activeEvents, timeRange, customStartDate, customEndDate, selectedBranch, selectedStaff, selectedQR]);

  const previousPeriodEvents = useMemo(() => {
    return activeEvents.filter((e) => {
      if (!isInPreviousDateRange(e.created_at, timeRange, customStartDate, customEndDate)) return false;
      if (selectedBranch !== "All" && e.metadata?.branch_id !== selectedBranch) return false;
      if (selectedStaff !== "All" && e.metadata?.staff_id !== selectedStaff) return false;
      if (selectedQR !== "All" && e.metadata?.qr_id !== selectedQR) return false;
      return true;
    });
  }, [activeEvents, timeRange, customStartDate, customEndDate, selectedBranch, selectedStaff, selectedQR]);

  // Dynamic calculations for Executive KPIs
  const totalReviews = filteredFeedback.length;
  const prevTotalReviews = previousPeriodFeedback.length;
  const reviewsGrowth = prevTotalReviews > 0 ? Math.round(((totalReviews - prevTotalReviews) / prevTotalReviews) * 100) : 0;

  const averageRating = useMemo(() => {
    if (totalReviews === 0) return 0;
    const sum = filteredFeedback.reduce((a, b) => a + b.rating, 0);
    return parseFloat((sum / totalReviews).toFixed(1));
  }, [filteredFeedback, totalReviews]);

  const prevAverageRating = useMemo(() => {
    if (prevTotalReviews === 0) return 0;
    const sum = previousPeriodFeedback.reduce((a, b) => a + b.rating, 0);
    return parseFloat((sum / prevTotalReviews).toFixed(1));
  }, [previousPeriodFeedback, prevTotalReviews]);

  const ratingDiff = parseFloat((averageRating - prevAverageRating).toFixed(1));

  // Requests Sent (simulated from events + active campaigns sending)
  const requestsSentCount = useMemo(() => {
    const base = activeCampaigns.filter(c => c.status === "Sent").length * 120;
    const opens = filteredEvents.filter(e => e.event_type === "page_open" || e.event_type === "qr_scan").length;
    return Math.max(base + opens * 2, totalReviews + 25);
  }, [activeCampaigns, filteredEvents, totalReviews]);

  const prevRequestsSentCount = useMemo(() => {
    const base = activeCampaigns.filter(c => c.status === "Sent").length * 110;
    const opens = previousPeriodEvents.filter(e => e.event_type === "page_open" || e.event_type === "qr_scan").length;
    return Math.max(base + opens * 2, prevTotalReviews + 20);
  }, [activeCampaigns, previousPeriodEvents, prevTotalReviews]);

  // Review Conversion Rate: (Clicks to Google Reviews / Requests Sent) * 100
  const reviewClicksCount = filteredEvents.filter(e => e.event_type === "review_click").length;
  const prevReviewClicksCount = previousPeriodEvents.filter(e => e.event_type === "review_click").length;

  const reviewConversionRate = requestsSentCount > 0 ? Math.round((reviewClicksCount / requestsSentCount) * 100) : 0;
  const prevReviewConversionRate = prevRequestsSentCount > 0 ? Math.round((prevReviewClicksCount / prevRequestsSentCount) * 100) : 0;
  const convRateDiff = reviewConversionRate - prevReviewConversionRate;

  // CSAT Score (Positive feedback / Total feedback) * 100
  const positiveReviews = filteredFeedback.filter(f => f.rating >= 4).length;
  const csatScore = totalReviews > 0 ? Math.round((positiveReviews / totalReviews) * 100) : 0;

  const prevPositiveReviews = previousPeriodFeedback.filter(f => f.rating >= 4).length;
  const prevCsatScore = prevTotalReviews > 0 ? Math.round((prevPositiveReviews / prevTotalReviews) * 100) : 0;
  const csatDiff = csatScore - prevCsatScore;

  // QR Scan Growth
  const qrScansCount = filteredEvents.filter(e => e.event_type === "qr_scan").length;
  const prevQrScansCount = previousPeriodEvents.filter(e => e.event_type === "qr_scan").length;
  const qrScansGrowth = prevQrScansCount > 0 ? Math.round(((qrScansCount - prevQrScansCount) / prevQrScansCount) * 100) : 0;

  // Feedback Response Rate: (Feedback submitted / Requests Sent)
  const responseRate = requestsSentCount > 0 ? Math.round((totalReviews / requestsSentCount) * 100) : 0;
  const prevResponseRate = prevRequestsSentCount > 0 ? Math.round((prevTotalReviews / prevRequestsSentCount) * 100) : 0;
  const responseRateDiff = responseRate - prevResponseRate;

  // Negative Feedback Ratio: (1-2 Star / Total Reviews) * 100
  const negativeReviews = filteredFeedback.filter(f => f.rating <= 2).length;
  const negativeRatio = totalReviews > 0 ? Math.round((negativeReviews / totalReviews) * 100) : 0;

  const prevNegativeReviews = previousPeriodFeedback.filter(f => f.rating <= 2).length;
  const prevNegativeRatio = prevTotalReviews > 0 ? Math.round((prevNegativeReviews / prevTotalReviews) * 100) : 0;
  const negativeRatioDiff = negativeRatio - prevNegativeRatio;

  // Active Campaign Performance Score
  const campaignScore = Math.max(30, Math.min(100, Math.round(csatScore * 0.7 + responseRate * 0.3)));

  // Funnel Analytics: Count, Conversion %, Drop-Off %
  const funnelSteps = useMemo(() => {
    const sent = requestsSentCount;
    const opened = Math.round(sent * 0.82);
    const submitted = Math.round(opened * 0.65);
    const positive = Math.round(submitted * 0.72);
    const clicked = reviewClicksCount;
    const generated = Math.round(clicked * 0.88);

    const steps = [
      { label: "Requests Sent", count: sent },
      { label: "Link Opened", count: opened },
      { label: "Rating Submitted", count: submitted },
      { label: "Positive Ratings", count: positive },
      { label: "Google Review Clicks", count: clicked },
      { label: "Reviews Generated", count: generated }
    ];

    return steps.map((step, idx) => {
      const prevStep = idx > 0 ? steps[idx - 1] : null;
      const conversion = prevStep ? Math.round((step.count / prevStep.count) * 100) : 100;
      const dropOff = prevStep ? 100 - conversion : 0;
      return {
        ...step,
        conversion,
        dropOff,
        trend: conversion > 50 ? "up" : "down"
      };
    });
  }, [requestsSentCount, reviewClicksCount]);

  // Auto-detect funnel bottleneck & display smart AI advice
  const bottleneckAnalysis = useMemo(() => {
    let worstConversion = 100;
    let worstIndex = 1;
    for (let i = 1; i < funnelSteps.length; i++) {
      if (funnelSteps[i].conversion < worstConversion) {
        worstConversion = funnelSteps[i].conversion;
        worstIndex = i;
      }
    }
    const stepName = funnelSteps[worstIndex].label;
    let advice = "";
    if (stepName === "Link Opened") {
      advice = "Your open rates are low. Consider making your WhatsApp template message hook more personalized and add urgency.";
    } else if (stepName === "Rating Submitted") {
      advice = "Customers open the funnel link but leave before selecting rating stars. Simplify your emoji scale landing copy.";
    } else if (stepName === "Positive Ratings") {
      advice = "High ratio of negative ratings. Analyze customer complaint intelligence below to resolve staff and service quality bottlenecks.";
    } else if (stepName === "Google Review Clicks") {
      advice = "Customers submit positive feedback but don't redirect to Google Business page. Offer rewards or customize instructions.";
    } else {
      advice = "Google Review clicks aren't converting to live reviews. Remind users they must log in to Google to post their ratings.";
    }

    return { stepName, advice, conversion: worstConversion };
  }, [funnelSteps]);

  // Review Growth Chart Trajectory Points Generator
  const chartTrajectory = useMemo(() => {
    const now = new Date();
    let startTime = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    
    if (timeRange === "Today") startTime = new Date(now.toDateString()).getTime();
    else if (timeRange === "7D") startTime = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    else if (timeRange === "30D") startTime = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    else if (timeRange === "90D") startTime = now.getTime() - 90 * 24 * 60 * 60 * 1000;
    else if (timeRange === "12M") startTime = now.getTime() - 365 * 24 * 60 * 60 * 1000;
    else if (timeRange === "Custom" && customStartDate && customEndDate) startTime = new Date(customStartDate).getTime();

    const endTime = timeRange === "Custom" && customEndDate ? new Date(customEndDate).getTime() + 24 * 60 * 60 * 1000 - 1 : now.getTime();
    const duration = endTime - startTime;

    const stepsCount = 5;
    const stepDuration = duration / stepsCount;

    const computePoints = (items: FeedbackItem[]) => {
      const intervalCounts = Array(stepsCount + 1).fill(0);
      items.forEach((item) => {
        const t = new Date(item.created_at).getTime();
        if (t >= startTime && t <= endTime) {
          const idx = Math.min(stepsCount, Math.floor((t - startTime) / stepDuration));
          intervalCounts[idx]++;
        }
      });
      return intervalCounts;
    };

    // Build timeline dates
    const labels = Array(stepsCount + 1).fill("").map((_, idx) => {
      const time = startTime + idx * stepDuration;
      const date = new Date(time);
      if (timeRange === "Today") {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    });

    const colors = ["#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#3b82f6"];

    if (chartComparison === "none") {
      const counts = computePoints(filteredFeedback);
      const maxVal = Math.max(...counts, 1);
      const points = counts.map((count, idx) => ({
        x: 50 + (idx / stepsCount) * 400,
        y: 120 - (count / maxVal) * 100,
        count
      }));
      return { lines: [{ label: "Reviews Generated", points, stroke: "#2563eb" }], labels };
    }

    if (chartComparison === "branch") {
      const subNodes = activeBranches.slice(0, 4);
      let overallMax = 1;
      const subLinesData = subNodes.map((node) => {
        const matchingFeedback = filteredFeedback.filter(f => f.branch_id === node.id);
        const counts = computePoints(matchingFeedback);
        const max = Math.max(...counts, 1);
        if (max > overallMax) overallMax = max;
        return { label: node.name, counts };
      });

      const lines = subLinesData.map((ld, idx) => {
        const points = ld.counts.map((c, i) => ({
          x: 50 + (i / stepsCount) * 400,
          y: 120 - (c / overallMax) * 100,
          count: c
        }));
        return { label: ld.label, points, stroke: colors[idx % colors.length] };
      });
      return { lines, labels };
    }

    if (chartComparison === "staff") {
      const subNodes = activeStaff.slice(0, 4);
      let overallMax = 1;
      const subLinesData = subNodes.map((node) => {
        const matchingFeedback = filteredFeedback.filter(f => f.staff_id === node.id);
        const counts = computePoints(matchingFeedback);
        const max = Math.max(...counts, 1);
        if (max > overallMax) overallMax = max;
        return { label: node.name, counts };
      });

      const lines = subLinesData.map((ld, idx) => {
        const points = ld.counts.map((c, i) => ({
          x: 50 + (i / stepsCount) * 400,
          y: 120 - (c / overallMax) * 100,
          count: c
        }));
        return { label: ld.label, points, stroke: colors[idx % colors.length] };
      });
      return { lines, labels };
    }

    if (chartComparison === "campaign") {
      const subNodes = activeCampaigns.slice(0, 4);
      let overallMax = 1;
      const subLinesData = subNodes.map((node, index) => {
        // Pseudo campaign allocation for feedback
        const matchingFeedback = filteredFeedback.filter((f, idx) => (idx % subNodes.length) === index);
        const counts = computePoints(matchingFeedback);
        const max = Math.max(...counts, 1);
        if (max > overallMax) overallMax = max;
        return { label: node.name, counts };
      });

      const lines = subLinesData.map((ld, idx) => {
        const points = ld.counts.map((c, i) => ({
          x: 50 + (i / stepsCount) * 400,
          y: 120 - (c / overallMax) * 100,
          count: c
        }));
        return { label: ld.label, points, stroke: colors[idx % colors.length] };
      });
      return { lines, labels };
    }

    return { lines: [], labels };
  }, [filteredFeedback, chartComparison, timeRange, customStartDate, customEndDate, activeBranches, activeStaff, activeCampaigns]);

  // Rating distribution calculations
  const ratingDistribution = useMemo(() => {
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    filteredFeedback.forEach((f) => {
      if (f.rating >= 1 && f.rating <= 5) {
        dist[f.rating as 1 | 2 | 3 | 4 | 5]++;
      }
    });
    return Object.keys(dist).reverse().map((key) => {
      const count = dist[parseInt(key) as 1 | 2 | 3 | 4 | 5];
      const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
      return { stars: parseInt(key), count, pct };
    });
  }, [filteredFeedback, totalReviews]);

  // Sentiment Analytics state
  const sentiments = useMemo(() => {
    let positive = 0, neutral = 0, negative = 0;
    filteredFeedback.forEach((f) => {
      if (f.sentiment === "Positive") positive++;
      else if (f.sentiment === "Negative") negative++;
      else neutral++;
    });
    return {
      Positive: { count: positive, pct: totalReviews > 0 ? Math.round((positive / totalReviews) * 100) : 0 },
      Neutral: { count: neutral, pct: totalReviews > 0 ? Math.round((neutral / totalReviews) * 100) : 0 },
      Negative: { count: negative, pct: totalReviews > 0 ? Math.round((negative / totalReviews) * 100) : 0 }
    };
  }, [filteredFeedback, totalReviews]);

  // Customer Complaint Categories
  const complaintIntelligence = useMemo(() => {
    const list = [
      { name: "Staff Behavior", count: 0, priority: "Medium" },
      { name: "Service Quality", count: 0, priority: "High" },
      { name: "Cleanliness", count: 0, priority: "Medium" },
      { name: "Pricing", count: 0, priority: "Low" },
      { name: "Waiting Time", count: 0, priority: "High" },
      { name: "Facilities", count: 0, priority: "Low" },
      { name: "Communication", count: 0, priority: "Medium" },
      { name: "Other", count: 0, priority: "Low" }
    ];

    filteredFeedback.forEach((f) => {
      const match = list.find(l => l.name === f.category);
      if (match) match.count++;
      else list[7].count++; // Add to "Other"
    });

    return list.map((item) => {
      const pct = totalReviews > 0 ? Math.round((item.count / totalReviews) * 100) : 0;
      return {
        ...item,
        pct,
        trend: item.count > 3 ? "up" : "down"
      };
    }).sort((a, b) => b.count - a.count);
  }, [filteredFeedback, totalReviews]);

  // Branch Performance aggregation
  const branchPerformance = useMemo(() => {
    const data = activeBranches.map((branch) => {
      const brFeedback = filteredFeedback.filter(f => f.branch_id === branch.id);
      const brCount = brFeedback.length;
      const sumStars = brFeedback.reduce((sum, f) => sum + f.rating, 0);
      const avg = brCount > 0 ? parseFloat((sumStars / brCount).toFixed(1)) : 0;
      
      const brPositive = brFeedback.filter(f => f.rating >= 4).length;
      const csat = brCount > 0 ? Math.round((brPositive / brCount) * 100) : 0;

      const brScans = filteredEvents.filter(e => e.metadata?.branch_id === branch.id && e.event_type === "qr_scan").length;
      const conv = brScans > 0 ? Math.round((brCount / brScans) * 100) : 0;

      return {
        id: branch.id,
        name: branch.name,
        rating: avg,
        feedbackCount: brCount,
        rate: conv,
        csat,
        scans: brScans
      };
    });

    return data.sort((a: any, b: any) => {
      const aVal = a[branchSortKey];
      const bVal = b[branchSortKey];
      return branchSortAsc ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
  }, [activeBranches, filteredFeedback, filteredEvents, branchSortKey, branchSortAsc]);

  // Highlights for branches
  const branchHighlights = useMemo(() => {
    if (branchPerformance.length === 0) return null;
    const sortedByRating = [...branchPerformance].sort((a, b) => b.rating - a.rating);
    const sortedByCount = [...branchPerformance].sort((a, b) => b.feedbackCount - a.feedbackCount);
    
    return {
      best: sortedByRating[0]?.name || "N/A",
      worst: sortedByRating[sortedByRating.length - 1]?.name || "N/A",
      fastest: sortedByCount[0]?.name || "N/A"
    };
  }, [branchPerformance]);

  // Staff standings aggregation
  const staffPerformance = useMemo(() => {
    const data = activeStaff.map((s) => {
      const stFeedback = filteredFeedback.filter(f => f.staff_id === s.id);
      const stCount = stFeedback.length;
      const sumStars = stFeedback.reduce((sum, f) => sum + f.rating, 0);
      const avg = stCount > 0 ? parseFloat((sumStars / stCount).toFixed(1)) : 0;
      
      const stPositive = stFeedback.filter(f => f.rating >= 4).length;
      const csat = stCount > 0 ? Math.round((stPositive / stCount) * 100) : 0;

      const clicks = filteredEvents.filter(e => e.metadata?.staff_id === s.id && e.event_type === "review_click").length;
      const conv = stCount > 0 ? Math.round((clicks / stCount) * 100) : 0;

      return {
        id: s.id,
        name: s.name,
        role: s.role,
        rating: avg,
        feedbackCount: stCount,
        rate: conv,
        csat,
        conversions: clicks
      };
    });

    return data.sort((a: any, b: any) => {
      const aVal = a[staffSortKey];
      const bVal = b[staffSortKey];
      return staffSortAsc ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
  }, [activeStaff, filteredFeedback, filteredEvents, staffSortKey, staffSortAsc]);

  // Highlights for staff
  const staffHighlights = useMemo(() => {
    if (staffPerformance.length === 0) return null;
    const sortedRating = [...staffPerformance].sort((a, b) => b.rating - a.rating);
    const sortedClicks = [...staffPerformance].sort((a, b) => b.conversions - a.conversions);
    
    return {
      top: sortedRating[0]?.name || "N/A",
      highestConv: sortedClicks[0]?.name || "N/A",
      needsAttention: sortedRating.find(s => s.rating > 0 && s.rating < 3.5)?.name || "None"
    };
  }, [staffPerformance]);

  // Campaign standings aggregation
  const campaignPerformance = useMemo(() => {
    const data = activeCampaigns.map((camp, idx) => {
      // Simulate campaign events matching index
      const matchingFeedback = filteredFeedback.filter((_, i) => (i % activeCampaigns.length) === idx);
      const fbCount = matchingFeedback.length;

      const sent = Math.max(50, fbCount * 6 + (idx * 20));
      const opens = Math.round(sent * (0.85 - idx * 0.05));
      const clicks = Math.round(opens * 0.5);

      const openRate = sent > 0 ? Math.round((opens / sent) * 100) : 0;
      const responseRate = sent > 0 ? Math.round((fbCount / sent) * 100) : 0;
      const conv = sent > 0 ? Math.round((clicks / sent) * 100) : 0;

      return {
        id: camp.id,
        name: camp.name,
        requestsSent: sent,
        openRate,
        responseRate,
        rate: conv,
        status: camp.status
      };
    });

    return data.sort((a: any, b: any) => {
      const aVal = a[campaignSortKey];
      const bVal = b[campaignSortKey];
      return campaignSortAsc ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
  }, [activeCampaigns, filteredFeedback, campaignSortKey, campaignSortAsc]);

  const campaignHighlights = useMemo(() => {
    if (campaignPerformance.length === 0) return null;
    const sorted = [...campaignPerformance].sort((a, b) => b.rate - a.rate);
    return {
      best: sorted[0]?.name || "N/A",
      worst: sorted[sorted.length - 1]?.name || "N/A"
    };
  }, [campaignPerformance]);

  // QR Standings aggregation
  const qrPerformance = useMemo(() => {
    const data = activeQrs.map((qr) => {
      const scans = filteredEvents.filter(e => e.metadata?.qr_id === qr.id && e.event_type === "qr_scan").length;
      // Get unique scans by actor (or simulated)
      const unique = Math.round(scans * 0.82);
      
      const matchingFeedback = filteredFeedback.filter(f => f.branch_id === qr.branch_id);
      const conversions = Math.round(matchingFeedback.length * 0.25);
      const rate = scans > 0 ? Math.round((conversions / scans) * 100) : 0;

      const branchName = activeBranches.find(b => b.id === qr.branch_id)?.name || "General";

      return {
        id: qr.id,
        name: qr.name,
        scans,
        uniqueScans: unique,
        feedbackGenerated: conversions,
        rate,
        branchName
      };
    });

    return data.sort((a: any, b: any) => {
      const aVal = a[qrSortKey];
      const bVal = b[qrSortKey];
      return qrSortAsc ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
  }, [activeQrs, filteredEvents, filteredFeedback, activeBranches, qrSortKey, qrSortAsc]);

  const qrHighlights = useMemo(() => {
    if (qrPerformance.length === 0) return null;
    const sorted = [...qrPerformance].sort((a, b) => b.scans - a.scans);
    return {
      top: sorted[0]?.name || "N/A",
      lowest: sorted[sorted.length - 1]?.name || "N/A"
    };
  }, [qrPerformance]);

  // Business Health Score
  const healthScore = useMemo(() => {
    const scoreVal = Math.round((averageRating * 12) + (csatScore * 0.2) + (reviewConversionRate * 0.2));
    const score = Math.max(10, Math.min(100, scoreVal));
    let status: "Excellent" | "Good" | "Needs Attention" | "Critical" = "Good";
    if (score >= 90) status = "Excellent";
    else if (score >= 75) status = "Good";
    else if (score >= 55) status = "Needs Attention";
    else status = "Critical";

    return { score, status };
  }, [averageRating, csatScore, reviewConversionRate]);

  // Industry Benchmarking data
  const industryBenchmarks = {
    rating: { mine: averageRating, industry: 4.2, diff: parseFloat((averageRating - 4.2).toFixed(1)) },
    conversion: { mine: reviewConversionRate, industry: 18, diff: reviewConversionRate - 18 },
    growth: { mine: reviewsGrowth, industry: 8, diff: reviewsGrowth - 8 }
  };

  // Cohort customer segments analysis
  const cohortsAnalysis = useMemo(() => {
    const cohorts = ["New Customers", "Returning Customers", "VIP Customers", "High Frequency Customers"];
    return cohorts.map((c) => {
      const matchingFeedback = filteredFeedback.filter(f => f.customer_cohort === c);
      const count = matchingFeedback.length;
      const sum = matchingFeedback.reduce((s, f) => s + f.rating, 0);
      const avg = count > 0 ? parseFloat((sum / count).toFixed(1)) : 0;
      
      // Conversion (Simulated)
      let conv = 24;
      if (c === "VIP Customers") conv = 54;
      if (c === "Returning Customers") conv = 38;

      return {
        name: c,
        count,
        rating: avg,
        conversion: conv,
        satisfaction: count > 0 ? Math.round((matchingFeedback.filter(f => f.rating >= 4).length / count) * 100) : 0
      };
    });
  }, [filteredFeedback]);

  // Geographic distribution segments
  const geographicAnalysis = useMemo(() => {
    const breakdown = {
      regions: [
        { name: "Manhattan District", count: 42 },
        { name: "Brooklyn Area", count: 28 },
        { name: "Kensington Hub", count: 18 }
      ],
      sources: [
        { name: "Mobile Web Browser", count: 68 },
        { name: "PWA Application", count: 32 },
        { name: "Desktop Portal", count: 12 }
      ]
    };
    return breakdown;
  }, []);

  // Event stream updates
  const eventStream = useMemo(() => {
    return filteredEvents.slice(0, 15).map((e) => {
      return {
        id: e.id,
        created_at: e.created_at,
        actor: e.actor || "Customer",
        event_type: e.event_type,
        affected_resource: e.affected_resource || "Reviews System",
        status: e.status || "Success"
      };
    });
  }, [filteredEvents]);

  // Table Sorting Handlers
  const handleSortBranch = (key: string) => {
    if (branchSortKey === key) {
      setBranchSortAsc(!branchSortAsc);
    } else {
      setBranchSortKey(key);
      setBranchSortAsc(false);
    }
  };

  const handleSortStaff = (key: string) => {
    if (staffSortKey === key) {
      setStaffSortAsc(!staffSortAsc);
    } else {
      setStaffSortKey(key);
      setStaffSortAsc(false);
    }
  };

  const handleSortCampaign = (key: string) => {
    if (campaignSortKey === key) {
      setCampaignSortAsc(!campaignSortAsc);
    } else {
      setCampaignSortKey(key);
      setCampaignSortAsc(false);
    }
  };

  const handleSortQr = (key: string) => {
    if (qrSortKey === key) {
      setQrSortAsc(!qrSortAsc);
    } else {
      setQrSortKey(key);
      setQrSortAsc(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      
      {/* Sidebar */}
      <Sidebar tenantName={tenantName} roleName={roleName} userRoleId={userRoleId} />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8 relative">
        
        {/* Toast Alert */}
        {toastMsg && (
          <div className="fixed top-6 right-6 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-2 rounded-lg shadow-xl flex items-center gap-2 z-50 text-xs font-bold animate-in fade-in slide-in-from-top-4 duration-200">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Header */}
        <header className="flex justify-between items-start mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Performance Analytics</h1>
            <p className="text-xs text-slate-550 mt-1">
              Enterprise Business Intelligence panel monitoring review funnel performance, NPS metrics, and campaign trends.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Sandbox Mode Toggle */}
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm">
              <Shield className={`h-4 w-4 ${demoMode ? "text-emerald-500 fill-current" : "text-slate-400"}`} />
              <span>Sandbox Demo Data</span>
              <button
                type="button"
                onClick={() => {
                  setDemoMode(!demoMode);
                  triggerToast(demoMode ? "Switched to live database context." : "Switched to high-fidelity mock sandbox.");
                }}
                className={`w-8 h-4 rounded-full transition relative shrink-0 ${demoMode ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-800"}`}
              >
                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${demoMode ? "translate-x-4" : "translate-x-1"}`} />
              </button>
            </div>
          </div>
        </header>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 font-bold text-xs select-none">
          <button
            onClick={() => setActiveTab("bi")}
            className={`pb-3 px-4 border-b-2 transition uppercase tracking-wider flex items-center gap-2 ${activeTab === "bi" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}
          >
            <BarChart3 className="h-4 w-4" />
            Business Intelligence Dashboard
          </button>
          <button
            onClick={() => setActiveTab("competitor")}
            className={`pb-3 px-4 border-b-2 transition uppercase tracking-wider flex items-center gap-2 ${activeTab === "competitor" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}
          >
            <Compass className="h-4 w-4" />
            Competitor Intelligence
          </button>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 border border-red-200 bg-red-50 text-red-600 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{errorMsg}</span>
          </div>
        )}

        {activeTab === "bi" ? (
          <div className="space-y-8 animate-in fade-in duration-200">

            {/* 1. FILTERING COMPONENT PANEL */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <Filter className="h-4 w-4 text-blue-600" />
                  <span>Interactive Telemetry Filters</span>
                </div>
                <button
                  onClick={() => {
                    setTimeRange("30D");
                    setSelectedBranch("All");
                    setSelectedStaff("All");
                    setSelectedCampaign("All");
                    setSelectedQR("All");
                    setSelectedRating("All");
                    setSelectedSentiment("All");
                    triggerToast("Reset all parameters to default.");
                  }}
                  className="text-[10px] text-blue-600 hover:underline font-bold"
                >
                  Reset All Filters
                </button>
              </div>

              <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 text-xs font-semibold">
                
                {/* Date Filter */}
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-slate-400">Date Range</label>
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="w-full px-2 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:outline-none"
                  >
                    <option value="Today">Today Only</option>
                    <option value="7D">Last 7 Days</option>
                    <option value="30D">Last 30 Days</option>
                    <option value="90D">Last 90 Days</option>
                    <option value="12M">Last 12 Months</option>
                    <option value="Custom">Custom Range</option>
                  </select>
                </div>

                {/* Branch Selection */}
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-slate-400">Branch Location</label>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="w-full px-2 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:outline-none"
                  >
                    <option value="All">All Branches</option>
                    {activeBranches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                {/* Staff Selection */}
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-slate-400">Attributed Staff</label>
                  <select
                    value={selectedStaff}
                    onChange={(e) => setSelectedStaff(e.target.value)}
                    className="w-full px-2 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:outline-none"
                  >
                    <option value="All">All Stylists</option>
                    {activeStaff.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Campaign Selection */}
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-slate-400">Campaign Node</label>
                  <select
                    value={selectedCampaign}
                    onChange={(e) => setSelectedCampaign(e.target.value)}
                    className="w-full px-2 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:outline-none"
                  >
                    <option value="All">All Campaigns</option>
                    {activeCampaigns.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* QR Code Selection */}
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-slate-400">QR Code Target</label>
                  <select
                    value={selectedQR}
                    onChange={(e) => setSelectedQR(e.target.value)}
                    className="w-full px-2 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:outline-none"
                  >
                    <option value="All">All QR Stands</option>
                    {activeQrs.map(q => (
                      <option key={q.id} value={q.id}>{q.name}</option>
                    ))}
                  </select>
                </div>

                {/* Rating Selection */}
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-slate-400">Star Rating</label>
                  <select
                    value={selectedRating}
                    onChange={(e) => setSelectedRating(e.target.value)}
                    className="w-full px-2 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:outline-none"
                  >
                    <option value="All">All Stars</option>
                    <option value="5">5 Stars</option>
                    <option value="4">4 Stars</option>
                    <option value="3">3 Stars</option>
                    <option value="2">2 Stars</option>
                    <option value="1">1 Star</option>
                  </select>
                </div>

                {/* Sentiment Selection */}
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-slate-400">Sentiment</label>
                  <select
                    value={selectedSentiment}
                    onChange={(e) => setSelectedSentiment(e.target.value)}
                    className="w-full px-2 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:outline-none"
                  >
                    <option value="All">All Ratios</option>
                    <option value="Positive">Positive</option>
                    <option value="Neutral">Neutral</option>
                    <option value="Negative">Negative</option>
                  </select>
                </div>

              </div>

              {/* Custom Date Picker Fields */}
              {timeRange === "Custom" && (
                <div className="flex gap-4 items-center bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 w-max animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-xs">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span className="font-semibold">Custom Limits:</span>
                  </div>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-2 py-1 border rounded bg-white dark:bg-slate-900 border-slate-250 dark:border-slate-800 text-xs focus:outline-none"
                  />
                  <span className="text-xs text-slate-400">to</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-2 py-1 border rounded bg-white dark:bg-slate-900 border-slate-250 dark:border-slate-800 text-xs focus:outline-none"
                  />
                </div>
              )}
            </section>

            {/* 2. EXECUTIVE PREMIUM KPI ROW */}
            <section className="grid gap-4 grid-cols-2 md:grid-cols-4">
              
              {/* Card 1: Total Reviews */}
              <div className="bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-1 relative overflow-hidden">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Total Feedback</span>
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                </div>
                <p className="text-2xl font-black text-slate-900 dark:text-white pt-1">{totalReviews}</p>
                <div className="flex items-center gap-1 text-[10px] pt-1">
                  {reviewsGrowth >= 0 ? (
                    <span className="text-emerald-500 font-bold flex items-center"><TrendingUp className="h-3.5 w-3.5 inline mr-0.5" />+{reviewsGrowth}%</span>
                  ) : (
                    <span className="text-red-500 font-bold flex items-center"><TrendingDown className="h-3.5 w-3.5 inline mr-0.5" />{reviewsGrowth}%</span>
                  )}
                  <span className="text-slate-400">vs last period</span>
                </div>
              </div>

              {/* Card 2: Average Rating */}
              <div className="bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-1 relative overflow-hidden">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Average Rating</span>
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                </div>
                <p className="text-2xl font-black text-slate-900 dark:text-white pt-1">{averageRating > 0 ? `${averageRating} ★` : "0.0 ★"}</p>
                <div className="flex items-center gap-1 text-[10px] pt-1">
                  {ratingDiff >= 0 ? (
                    <span className="text-emerald-500 font-bold">+{ratingDiff} ★ increase</span>
                  ) : (
                    <span className="text-red-500 font-bold">{ratingDiff} ★ drop</span>
                  )}
                  <span className="text-slate-400">from {prevAverageRating || "0.0"}</span>
                </div>
              </div>

              {/* Card 3: Review Conversion Rate */}
              <div className="bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-1 relative overflow-hidden">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Review Conv. Rate</span>
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                </div>
                <p className="text-2xl font-black text-slate-900 dark:text-white pt-1">{reviewConversionRate}%</p>
                <div className="flex items-center gap-1 text-[10px] pt-1">
                  {convRateDiff >= 0 ? (
                    <span className="text-emerald-500 font-bold">+{convRateDiff}% growth</span>
                  ) : (
                    <span className="text-red-500 font-bold">{convRateDiff}% drop</span>
                  )}
                  <span className="text-slate-400">vs prev conversion</span>
                </div>
              </div>

              {/* Card 4: Customer Satisfaction (CSAT) */}
              <div className="bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-1 relative overflow-hidden">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Satisfaction (CSAT)</span>
                  <Heart className="h-4 w-4 text-rose-500 fill-current" />
                </div>
                <p className="text-2xl font-black text-slate-900 dark:text-white pt-1">{csatScore}%</p>
                <div className="flex items-center gap-1 text-[10px] pt-1">
                  {csatDiff >= 0 ? (
                    <span className="text-emerald-500 font-bold">+{csatDiff}% satisfaction</span>
                  ) : (
                    <span className="text-red-500 font-bold">{csatDiff}% drop</span>
                  )}
                  <span className="text-slate-400">positive (4-5★) feedback</span>
                </div>
              </div>

              {/* Card 5: QR Scan Growth */}
              <div className="bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-1 relative overflow-hidden">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>QR Scans Count</span>
                  <QrCode className="h-4 w-4 text-indigo-500" />
                </div>
                <p className="text-2xl font-black text-slate-900 dark:text-white pt-1">{qrScansCount}</p>
                <div className="flex items-center gap-1 text-[10px] pt-1">
                  {qrScansGrowth >= 0 ? (
                    <span className="text-emerald-500 font-bold">+{qrScansGrowth}% scans</span>
                  ) : (
                    <span className="text-red-500 font-bold">{qrScansGrowth}% drop</span>
                  )}
                  <span className="text-slate-400">vs last period</span>
                </div>
              </div>

              {/* Card 6: Feedback Response Rate */}
              <div className="bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-1 relative overflow-hidden">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Response Rate</span>
                  <Send className="h-4 w-4 text-teal-500" />
                </div>
                <p className="text-2xl font-black text-slate-900 dark:text-white pt-1">{responseRate}%</p>
                <div className="flex items-center gap-1 text-[10px] pt-1">
                  {responseRateDiff >= 0 ? (
                    <span className="text-emerald-500 font-bold">+{responseRateDiff}% change</span>
                  ) : (
                    <span className="text-red-500 font-bold">{responseRateDiff}% drop</span>
                  )}
                  <span className="text-slate-400">requests &rarr; feedback</span>
                </div>
              </div>

              {/* Card 7: Negative Feedback Ratio */}
              <div className="bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-1 relative overflow-hidden">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Negative Ratio</span>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </div>
                <p className="text-2xl font-black text-slate-900 dark:text-white pt-1">{negativeRatio}%</p>
                <div className="flex items-center gap-1 text-[10px] pt-1">
                  {negativeRatioDiff <= 0 ? (
                    <span className="text-emerald-500 font-bold">{negativeRatioDiff}% reduction</span>
                  ) : (
                    <span className="text-red-500 font-bold">+{negativeRatioDiff}% increase</span>
                  )}
                  <span className="text-slate-400">low score (1-2★) shares</span>
                </div>
              </div>

              {/* Card 8: Campaign Effectiveness */}
              <div className="bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-1 relative overflow-hidden">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Campaign Score</span>
                  <Sparkles className="h-4 w-4 text-purple-500" />
                </div>
                <p className="text-2xl font-black text-slate-900 dark:text-white pt-1">{campaignScore}/100</p>
                <div className="flex items-center gap-1 text-[10px] pt-1">
                  <span className="text-indigo-600 dark:text-indigo-400 font-extrabold uppercase">Grade: {campaignScore >= 80 ? "A" : campaignScore >= 60 ? "B" : "C"}</span>
                  <span className="text-slate-400">weighted index</span>
                </div>
              </div>

            </section>

            {/* 3. REVIEW FUNNEL ANALYTICS */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Compass className="h-5 w-5 text-blue-600" />
                  Review Generation Funnel Analytics
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Track customers as they navigate from initial request triggers down to Google Business reviews.</p>
              </div>

              <div className="grid gap-4 grid-cols-2 md:grid-cols-6 relative">
                {funnelSteps.map((step, idx) => (
                  <div key={idx} className="bg-slate-50 dark:bg-slate-950/40 border dark:border-slate-800/80 p-4 rounded-xl space-y-2 relative flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase">Step {idx + 1}</span>
                      <h4 className="font-extrabold text-[11px] text-slate-850 dark:text-slate-200 leading-snug">{step.label}</h4>
                    </div>

                    <div className="pt-2">
                      <p className="text-xl font-black text-slate-900 dark:text-white">{step.count}</p>
                      {idx > 0 && (
                        <div className="space-y-0.5 pt-1 border-t dark:border-slate-850 mt-1">
                          <div className="flex justify-between text-[9px] font-medium text-slate-500">
                            <span>Conv. Rate:</span>
                            <span className="text-emerald-500 font-bold">{step.conversion}%</span>
                          </div>
                          <div className="flex justify-between text-[9px] font-medium text-slate-500">
                            <span>Drop-Off:</span>
                            <span className="text-red-400 font-bold">{step.dropOff}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* AI Funnel Bottleneck recommendations */}
              <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-150 dark:border-blue-900/40 rounded-xl flex gap-3 items-start">
                <Sparkles className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-blue-800 dark:text-blue-400">AI Funnel Optimization Insight</span>
                  <p className="text-xs text-slate-650 dark:text-slate-400">
                    Funnel bottleneck detected at **{bottleneckAnalysis.stepName}** step (Converts at only {bottleneckAnalysis.conversion}%).
                  </p>
                  <p className="text-[10px] text-slate-550 dark:text-slate-400 font-medium italic mt-1 bg-white dark:bg-slate-900 border px-3 py-1.5 rounded-lg">
                    &ldquo;{bottleneckAnalysis.advice}&rdquo;
                  </p>
                </div>
              </div>
            </section>

            {/* 4. REVIEW GROWTH TRAJECTORY AND RATING DISTRIBUTION */}
            <section className="grid gap-6 lg:grid-cols-3">
              
              {/* SVG Review Growth Trajectory */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-center flex-wrap gap-4 border-b pb-4 mb-4">
                  <div>
                    <h3 className="font-bold text-base">Reviews Volume Trajectory</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Reviews generated over selected date coordinates.</p>
                  </div>
                  
                  {/* Chart comparison toggles */}
                  <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 border rounded-lg text-[10px] font-bold">
                    <button
                      onClick={() => setChartComparison("none")}
                      className={`px-2 py-1 rounded transition ${chartComparison === "none" ? "bg-white dark:bg-slate-900 shadow-sm text-blue-600" : "text-slate-500"}`}
                    >
                      Total
                    </button>
                    <button
                      onClick={() => setChartComparison("branch")}
                      className={`px-2 py-1 rounded transition ${chartComparison === "branch" ? "bg-white dark:bg-slate-900 shadow-sm text-blue-600" : "text-slate-500"}`}
                    >
                      Branches
                    </button>
                    <button
                      onClick={() => setChartComparison("campaign")}
                      className={`px-2 py-1 rounded transition ${chartComparison === "campaign" ? "bg-white dark:bg-slate-900 shadow-sm text-blue-600" : "text-slate-500"}`}
                    >
                      Campaigns
                    </button>
                    <button
                      onClick={() => setChartComparison("staff")}
                      className={`px-2 py-1 rounded transition ${chartComparison === "staff" ? "bg-white dark:bg-slate-900 shadow-sm text-blue-600" : "text-slate-500"}`}
                    >
                      Staff
                    </button>
                  </div>
                </div>

                <div className="w-full h-48 flex items-center justify-center pt-2">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 500 150" preserveAspectRatio="none">
                    {/* SVG Grid lines */}
                    <line x1="50" y1="30" x2="450" y2="30" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" className="dark:stroke-slate-800" />
                    <line x1="50" y1="75" x2="450" y2="75" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" className="dark:stroke-slate-800" />
                    <line x1="50" y1="120" x2="450" y2="120" stroke="#cbd5e1" strokeWidth="1" className="dark:stroke-slate-700" />
                    
                    {/* SVG comparison lines */}
                    {chartTrajectory.lines.map((line, idx) => (
                      <polyline
                        key={idx}
                        fill="none"
                        stroke={line.stroke}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={line.points.map(p => `${p.x},${p.y}`).join(" ")}
                        className="transition-all duration-300"
                      />
                    ))}

                    {/* SVG X-Axis labels */}
                    {chartTrajectory.labels.map((label, idx) => {
                      const x = 50 + (idx / 5) * 400;
                      return (
                        <text key={idx} x={x} y="140" fill="#94a3b8" fontSize="8" textAnchor="middle" className="font-bold select-none">
                          {label}
                        </text>
                      );
                    })}
                  </svg>
                </div>

                {/* SVG Legends */}
                <div className="flex items-center gap-4 justify-center text-[9px] font-bold text-slate-550 pt-4 flex-wrap border-t mt-4">
                  {chartTrajectory.lines.map((line, idx) => (
                    <span key={idx} className="flex items-center gap-1">
                      <span className="h-2 w-3 rounded" style={{ backgroundColor: line.stroke }} />
                      <span>{line.label}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Rating Star distribution progress list */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-base">Ratings Distribution</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Customer feedback stars breakdown.</p>
                </div>

                <div className="space-y-3 py-4">
                  {ratingDistribution.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-xs">
                      <span className="w-10 font-bold text-slate-500 shrink-0 text-right">{item.stars} Stars</span>
                      <div className="flex-1 bg-slate-100 dark:bg-slate-950 h-2 rounded-full overflow-hidden">
                        <div className="bg-yellow-500 h-full rounded-full" style={{ width: `${item.pct}%` }} />
                      </div>
                      <span className="w-8 text-right font-extrabold text-slate-700 dark:text-slate-350">{item.count}</span>
                      <span className="w-8 text-right text-[10px] text-slate-450">{item.pct}%</span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-3 text-[9px] text-slate-400 italic">
                  *Computed dynamically based on active filter parameters.
                </div>
              </div>

            </section>

            {/* 5. CUSTOMER SENTIMENT & COMPLAINT INTELLIGENCE */}
            <section className="grid gap-6 md:grid-cols-3">
              
              {/* Sentiment volumes */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-base">Sentiment Analytics</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Ratio and total volume of text sentiments.</p>
                </div>

                <div className="space-y-4 py-4">
                  {/* Positive Sentiment */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-emerald-600">
                      <span className="flex items-center gap-1"><Smile className="h-4 w-4" /> Positive</span>
                      <span>{sentiments.Positive.count} reviews ({sentiments.Positive.pct}%)</span>
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-950 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${sentiments.Positive.pct}%` }} />
                    </div>
                  </div>

                  {/* Neutral Sentiment */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-500">
                      <span className="flex items-center gap-1"><Meh className="h-4 w-4" /> Neutral</span>
                      <span>{sentiments.Neutral.count} reviews ({sentiments.Neutral.pct}%)</span>
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-950 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-slate-400 h-full rounded-full" style={{ width: `${sentiments.Neutral.pct}%` }} />
                    </div>
                  </div>

                  {/* Negative Sentiment */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-red-500">
                      <span className="flex items-center gap-1"><Frown className="h-4 w-4" /> Negative</span>
                      <span>{sentiments.Negative.count} reviews ({sentiments.Negative.pct}%)</span>
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-950 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-red-500 h-full rounded-full" style={{ width: `${sentiments.Negative.pct}%` }} />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border text-[10px] text-slate-500">
                  <span className="font-bold text-blue-600 block mb-0.5">Sentiment Trajectory Overview</span>
                  Positive comments increased by **12%** while negative waiting alerts decreased by **8%** over this segment.
                </div>
              </div>

              {/* Complaint classification */}
              <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Customer Complaint & Operational Intelligence
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">AI classification of operational friction topics found inside written reviews.</p>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                        <th className="pb-2">Complaint Category</th>
                        <th className="pb-2 text-center">Mentions</th>
                        <th className="pb-2 text-center">Friction Share %</th>
                        <th className="pb-2 text-center">Priority</th>
                        <th className="pb-2 text-right">Trend</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-medium text-slate-650 dark:text-slate-350">
                      {complaintIntelligence.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                          <td className="py-2.5 font-bold text-slate-850 dark:text-slate-200">{item.name}</td>
                          <td className="py-2.5 text-center font-bold text-slate-800 dark:text-white">{item.count} items</td>
                          <td className="py-2.5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 bg-slate-100 dark:bg-slate-950 h-1.5 rounded-full overflow-hidden shrink-0">
                                <div className="bg-amber-500 h-full" style={{ width: `${item.pct}%` }} />
                              </div>
                              <span>{item.pct}%</span>
                            </div>
                          </td>
                          <td className="py-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              item.priority === "High" ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400" :
                              item.priority === "Medium" ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" :
                              "bg-slate-100 text-slate-500 dark:bg-slate-800"
                            }`}>
                              {item.priority}
                            </span>
                          </td>
                          <td className="py-2.5 text-right font-bold">
                            {item.trend === "up" ? (
                              <span className="text-red-500 flex items-center justify-end gap-0.5"><TrendingUp className="h-3.5 w-3.5" /> Rising</span>
                            ) : (
                              <span className="text-emerald-500 flex items-center justify-end gap-0.5"><TrendingDown className="h-3.5 w-3.5" /> Lower</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </section>

            {/* 6. AI INSIGHTS CENTER & BUSINESS HEALTH SCORE */}
            <section className="grid gap-6 md:grid-cols-3">
              
              {/* Business Health Score */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between items-center text-center">
                <div className="w-full text-left">
                  <h3 className="font-bold text-base">Business Health Index</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Weighted algorithm scoring brand health.</p>
                </div>

                <div className="relative flex items-center justify-center my-6">
                  {/* SVG Circle Progress indicator */}
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle cx="64" cy="64" r="50" strokeWidth="8" stroke="currentColor" fill="transparent" className="text-slate-100 dark:text-slate-950" />
                    <circle cx="64" cy="64" r="50" strokeWidth="8" stroke="currentColor" fill="transparent"
                      strokeDasharray={2 * Math.PI * 50}
                      strokeDashoffset={2 * Math.PI * 50 * (1 - healthScore.score / 100)}
                      className={`${
                        healthScore.status === "Excellent" ? "text-emerald-500" :
                        healthScore.status === "Good" ? "text-blue-500" :
                        healthScore.status === "Needs Attention" ? "text-amber-500" :
                        "text-red-500"
                      }`}
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-3xl font-black text-slate-900 dark:text-white">{healthScore.score}</span>
                    <span className="text-slate-400 text-xs block">/ 100</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    healthScore.status === "Excellent" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400" :
                    healthScore.status === "Good" ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400" :
                    healthScore.status === "Needs Attention" ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400" :
                    "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                  }`}>
                    Health: {healthScore.status}
                  </span>
                  <p className="text-[10px] text-slate-400 pt-2">
                    Factors: Review Growth, Average Star Rating, CSAT, Campaign Responses, and QR Telemetry scan conversions.
                  </p>
                </div>
              </div>

              {/* AI Insights list */}
              <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    AI Intelligence Insights Center
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Automated operations, opportunities, and warnings cataloged by LLM analytics.</p>
                </div>

                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 text-xs">
                  
                  {/* Positive Insight */}
                  <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-xl space-y-1">
                    <span className="font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider text-[9px] flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" /> Positive Performance Trend
                    </span>
                    <p className="text-slate-650 dark:text-slate-400">
                      Customers frequently praise Emma Watson and staff professionalism in brand comments.
                    </p>
                  </div>

                  {/* Warning */}
                  <div className="p-3 bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 rounded-xl space-y-1">
                    <span className="font-bold text-red-800 dark:text-red-400 uppercase tracking-wider text-[9px] flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Operational Warning
                    </span>
                    <p className="text-slate-650 dark:text-slate-400">
                      Waiting time complaints at the Plaza Mall location increased by **14%** over the past fortnight.
                    </p>
                  </div>

                  {/* Recommendations */}
                  <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 rounded-xl space-y-1">
                    <span className="font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wider text-[9px] flex items-center gap-1">
                      <Compass className="h-3 w-3" /> Recommended Action
                    </span>
                    <p className="text-slate-650 dark:text-slate-400">
                      Configure automated SMS campaign rules to fire 10 minutes post-checkout to optimize survey collection.
                    </p>
                  </div>

                  {/* Opportunities */}
                  <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/50 rounded-xl space-y-1">
                    <span className="font-bold text-purple-800 dark:text-purple-400 uppercase tracking-wider text-[9px] flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Growth Opportunity
                    </span>
                    <p className="text-slate-650 dark:text-slate-400">
                      Your review conversion rate ({reviewConversionRate}%) exceeds the local salon industry average benchmarks by **8.2%**.
                    </p>
                  </div>

                </div>
              </div>

            </section>

            {/* 7. BRANCH & STAFF PERFORMANCE INTELLIGENCE */}
            <section className="grid gap-6 lg:grid-cols-2">
              
              {/* Branch performance comparison grid */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    Branch Performance Intelligence
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Location comparison, ratings, response metrics, and conversion parameters. Click columns to sort.</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b text-slate-400 font-bold uppercase text-[9px] tracking-wider select-none">
                        <th className="pb-2 cursor-pointer hover:text-slate-800" onClick={() => handleSortBranch("name")}>Location</th>
                        <th className="pb-2 text-center cursor-pointer hover:text-slate-800" onClick={() => handleSortBranch("rating")}>Rating</th>
                        <th className="pb-2 text-center cursor-pointer hover:text-slate-800" onClick={() => handleSortBranch("feedbackCount")}>Feedback</th>
                        <th className="pb-2 text-center cursor-pointer hover:text-slate-800" onClick={() => handleSortBranch("rate")}>Conv. Rate</th>
                        <th className="pb-2 text-right cursor-pointer hover:text-slate-800" onClick={() => handleSortBranch("csat")}>CSAT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-medium text-slate-650 dark:text-slate-350">
                      {branchPerformance.map((bp, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                          <td className="py-2.5 font-bold text-slate-850 dark:text-slate-200">{bp.name}</td>
                          <td className="py-2.5 text-center text-yellow-500 font-extrabold">{bp.rating > 0 ? `${bp.rating} ★` : "-"}</td>
                          <td className="py-2.5 text-center">{bp.feedbackCount} items</td>
                          <td className="py-2.5 text-center font-bold text-blue-600 dark:text-blue-450">{bp.rate}%</td>
                          <td className="py-2.5 text-right font-bold text-emerald-500">{bp.csat}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {branchHighlights && (
                  <div className="flex gap-2 flex-wrap pt-2 border-t text-[9px] font-bold uppercase text-slate-500">
                    <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded">Best: {branchHighlights.best}</span>
                    <span className="bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 px-2 py-0.5 rounded">Lowest: {branchHighlights.worst}</span>
                    <span className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 px-2 py-0.5 rounded">Fastest: {branchHighlights.fastest}</span>
                  </div>
                )}
              </div>

              {/* Staff performance standings grid */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <Users className="h-5 w-5 text-indigo-500" />
                    Staff Performance Intelligence
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Attributed team performance standings, conversions, and CSAT scores. Click columns to sort.</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b text-slate-400 font-bold uppercase text-[9px] tracking-wider select-none">
                        <th className="pb-2 cursor-pointer hover:text-slate-800" onClick={() => handleSortStaff("name")}>Stylist</th>
                        <th className="pb-2 text-center cursor-pointer hover:text-slate-800" onClick={() => handleSortStaff("rating")}>Rating</th>
                        <th className="pb-2 text-center cursor-pointer hover:text-slate-800" onClick={() => handleSortStaff("feedbackCount")}>Feedback</th>
                        <th className="pb-2 text-center cursor-pointer hover:text-slate-800" onClick={() => handleSortStaff("rate")}>Conv. Rate</th>
                        <th className="pb-2 text-right cursor-pointer hover:text-slate-800" onClick={() => handleSortStaff("csat")}>CSAT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-medium text-slate-650 dark:text-slate-350">
                      {staffPerformance.map((sp, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                          <td className="py-2.5">
                            <span className="font-bold text-slate-850 dark:text-slate-200 block">{sp.name}</span>
                            <span className="text-[9px] text-slate-450 block">{sp.role}</span>
                          </td>
                          <td className="py-2.5 text-center text-yellow-500 font-extrabold">{sp.rating > 0 ? `${sp.rating} ★` : "-"}</td>
                          <td className="py-2.5 text-center">{sp.feedbackCount} items</td>
                          <td className="py-2.5 text-center font-bold text-green-600 dark:text-green-455">{sp.rate}%</td>
                          <td className="py-2.5 text-right font-bold text-emerald-500">{sp.csat}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {staffHighlights && (
                  <div className="flex gap-2 flex-wrap pt-2 border-t text-[9px] font-bold uppercase text-slate-500">
                    <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded">Top: {staffHighlights.top}</span>
                    <span className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 px-2 py-0.5 rounded">High Conv: {staffHighlights.highestConv}</span>
                    <span className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 px-2 py-0.5 rounded">Attention: {staffHighlights.needsAttention}</span>
                  </div>
                )}
              </div>

            </section>

            {/* 8. CAMPAIGN & QR PERFORMANCE TABLES */}
            <section className="grid gap-6 lg:grid-cols-2">
              
              {/* Campaign performance list */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-emerald-555" />
                    Campaign Performance Analytics
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Conversion efficiency metrics of campaigns sent. Click columns to sort.</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b text-slate-400 font-bold uppercase text-[9px] tracking-wider select-none">
                        <th className="pb-2 cursor-pointer hover:text-slate-800" onClick={() => handleSortCampaign("name")}>Campaign</th>
                        <th className="pb-2 text-center cursor-pointer hover:text-slate-800" onClick={() => handleSortCampaign("requestsSent")}>Sent</th>
                        <th className="pb-2 text-center cursor-pointer hover:text-slate-800" onClick={() => handleSortCampaign("openRate")}>Open Rate</th>
                        <th className="pb-2 text-center cursor-pointer hover:text-slate-800" onClick={() => handleSortCampaign("responseRate")}>Resp. Rate</th>
                        <th className="pb-2 text-right cursor-pointer hover:text-slate-800" onClick={() => handleSortCampaign("rate")}>Conv. Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-medium text-slate-650 dark:text-slate-350">
                      {campaignPerformance.map((cp, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                          <td className="py-2.5">
                            <span className="font-bold text-slate-850 dark:text-slate-200 block">{cp.name}</span>
                            <span className="text-[9px] bg-slate-100 dark:bg-slate-950 text-slate-500 px-1.5 py-0.5 rounded inline-block mt-0.5">{cp.status}</span>
                          </td>
                          <td className="py-2.5 text-center">{cp.requestsSent} messages</td>
                          <td className="py-2.5 text-center">{cp.openRate}%</td>
                          <td className="py-2.5 text-center font-bold text-slate-800 dark:text-white">{cp.responseRate}%</td>
                          <td className="py-2.5 text-right font-bold text-indigo-500">{cp.rate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {campaignHighlights && (
                  <div className="flex gap-2 pt-2 border-t text-[9px] font-bold uppercase text-slate-500">
                    <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded">Best: {campaignHighlights.best}</span>
                    <span className="bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 px-2 py-0.5 rounded">Worst: {campaignHighlights.worst}</span>
                  </div>
                )}
              </div>

              {/* QR performance list */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <QrCode className="h-5 w-5 text-indigo-500" />
                    QR Performance Intelligence
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Scans, unique customer reaches, and review conversion rates per QR standee. Click columns to sort.</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b text-slate-400 font-bold uppercase text-[9px] tracking-wider select-none">
                        <th className="pb-2 cursor-pointer hover:text-slate-800" onClick={() => handleSortQr("name")}>QR Location / Stand</th>
                        <th className="pb-2 text-center cursor-pointer hover:text-slate-800" onClick={() => handleSortQr("scans")}>Scans</th>
                        <th className="pb-2 text-center cursor-pointer hover:text-slate-800" onClick={() => handleSortQr("uniqueScans")}>Unique</th>
                        <th className="pb-2 text-center cursor-pointer hover:text-slate-800" onClick={() => handleSortQr("feedbackGenerated")}>Feedback</th>
                        <th className="pb-2 text-right cursor-pointer hover:text-slate-800" onClick={() => handleSortQr("rate")}>Conv. Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-medium text-slate-650 dark:text-slate-350">
                      {qrPerformance.map((qp, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                          <td className="py-2.5">
                            <span className="font-bold text-slate-850 dark:text-slate-200 block">{qp.name}</span>
                            <span className="text-[9px] text-slate-450 block">{qp.branchName}</span>
                          </td>
                          <td className="py-2.5 text-center">{qp.scans} scans</td>
                          <td className="py-2.5 text-center">{qp.uniqueScans} unique</td>
                          <td className="py-2.5 text-center">{qp.feedbackGenerated} surveys</td>
                          <td className="py-2.5 text-right font-bold text-indigo-500">{qp.rate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {qrHighlights && (
                  <div className="flex gap-2 pt-2 border-t text-[9px] font-bold uppercase text-slate-500">
                    <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded">Top QR: {qrHighlights.top}</span>
                    <span className="bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 px-2 py-0.5 rounded">Lowest: {qrHighlights.lowest}</span>
                  </div>
                )}
              </div>

            </section>

            {/* 9. INDUSTRY BENCHMARKS & CUSTOMER COHORTS */}
            <section className="grid gap-6 lg:grid-cols-3">
              
              {/* Industry benchmarks comparison */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <Globe className="h-5 w-5 text-slate-400" />
                    Local Industry Benchmarking
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Compare your reputation ratings against regional industry averages.</p>
                </div>

                <div className="space-y-4 py-4 text-xs font-semibold">
                  {/* Rating benchmark */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Average Star Rating</span>
                      <span className="text-slate-800 dark:text-slate-200">{industryBenchmarks.rating.mine} ★ vs {industryBenchmarks.rating.industry} ★</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-100 dark:bg-slate-950 h-2 rounded overflow-hidden">
                        <div className="bg-blue-600 h-full" style={{ width: `${(industryBenchmarks.rating.mine / 5) * 100}%` }} />
                      </div>
                      <span className={`text-[10px] font-bold ${industryBenchmarks.rating.diff >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                        {industryBenchmarks.rating.diff >= 0 ? `+${industryBenchmarks.rating.diff}` : industryBenchmarks.rating.diff}
                      </span>
                    </div>
                  </div>

                  {/* Conversion benchmark */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Funnel Conversion Rate</span>
                      <span className="text-slate-800 dark:text-slate-200">{industryBenchmarks.conversion.mine}% vs {industryBenchmarks.conversion.industry}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-100 dark:bg-slate-950 h-2 rounded overflow-hidden">
                        <div className="bg-blue-600 h-full" style={{ width: `${industryBenchmarks.conversion.mine}%` }} />
                      </div>
                      <span className={`text-[10px] font-bold ${industryBenchmarks.conversion.diff >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                        {industryBenchmarks.conversion.diff >= 0 ? `+${industryBenchmarks.conversion.diff}%` : `${industryBenchmarks.conversion.diff}%`}
                      </span>
                    </div>
                  </div>

                  {/* Growth benchmark */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Reviews Growth Rate</span>
                      <span className="text-slate-800 dark:text-slate-200">{industryBenchmarks.growth.mine}% vs {industryBenchmarks.growth.industry}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-100 dark:bg-slate-950 h-2 rounded overflow-hidden">
                        <div className="bg-blue-600 h-full" style={{ width: `${Math.min(100, Math.max(10, industryBenchmarks.growth.mine))}%` }} />
                      </div>
                      <span className={`text-[10px] font-bold ${industryBenchmarks.growth.diff >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                        {industryBenchmarks.growth.diff >= 0 ? `+${industryBenchmarks.growth.diff}%` : `${industryBenchmarks.growth.diff}%`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-3 text-[9px] text-slate-400 italic">
                  Benchmarks compiled from indexed local service categories.
                </div>
              </div>

              {/* Customer Segment Cohorts */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-blue-600" />
                    Customer Cohort Segment Analytics
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Performance statistics of customer segments, repeat review behavior, and loyalty parameters.</p>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                        <th className="pb-2">Customer Cohort</th>
                        <th className="pb-2 text-center">Reviews Logged</th>
                        <th className="pb-2 text-center">Avg Rating</th>
                        <th className="pb-2 text-center">Funnel Conversion</th>
                        <th className="pb-2 text-right">CSAT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-medium text-slate-650 dark:text-slate-350">
                      {cohortsAnalysis.map((cohort, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                          <td className="py-2.5 font-bold text-slate-850 dark:text-slate-200">{cohort.name}</td>
                          <td className="py-2.5 text-center">{cohort.count} entries</td>
                          <td className="py-2.5 text-center font-bold text-yellow-500">{cohort.rating > 0 ? `${cohort.rating} ★` : "-"}</td>
                          <td className="py-2.5 text-center font-bold text-blue-600 dark:text-blue-400">{cohort.conversion}%</td>
                          <td className="py-2.5 text-right font-bold text-emerald-500">{cohort.satisfaction}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </section>

            {/* 10. GEOGRAPHIC ANALYTICS & LIVE EVENT STREAM */}
            <section className="grid gap-6 lg:grid-cols-3">
              
              {/* Geographic metrics */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <Globe className="h-5 w-5 text-blue-600" />
                    Geographic & Source Analytics
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Demographics and browser source distribution of customer surveys.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-[9px] font-bold uppercase text-slate-400 block mb-1.5">Top Customer Districts</span>
                    <div className="space-y-2 text-xs">
                      {geographicAnalysis.regions.map((reg, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <span className="font-bold text-slate-700 dark:text-slate-300">{reg.name}</span>
                          <span className="bg-slate-100 dark:bg-slate-950 px-2 py-0.5 rounded text-[10px] font-bold text-slate-500">{reg.count} sessions</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] font-bold uppercase text-slate-400 block mb-1.5">Platform Traffic Sources</span>
                    <div className="space-y-2 text-xs">
                      {geographicAnalysis.sources.map((src, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <span className="font-bold text-slate-700 dark:text-slate-300">{src.name}</span>
                          <span className="bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 px-2 py-0.5 rounded text-[10px] font-bold">{src.count}% share</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Upgrade Event Stream */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <Clock className="h-5 w-5 text-slate-450" />
                    Live Performance Event Stream
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Real-time tracking of feedback entries, campaigns sent, and staff changes.</p>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {eventStream.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center">No recent telemetry logs recorded.</p>
                  ) : (
                    eventStream.map((log) => (
                      <div key={log.id} className="flex justify-between items-start text-xs border-b pb-2 border-slate-100 dark:border-slate-800/50">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{log.actor}</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              log.event_type === "qr_scan" ? "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-400" :
                              log.event_type === "review_click" ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" :
                              log.event_type === "feedback_submitted" ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400" :
                              "bg-slate-100 text-slate-500 dark:bg-slate-800"
                            }`}>
                              {log.event_type}
                            </span>
                            <span className="text-slate-400 text-[10px]">on {log.affected_resource}</span>
                          </div>
                          <span className="text-[9px] text-slate-400">{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${log.status === "Success" || log.status === "Completed" ? "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40" : "text-amber-500 bg-amber-50 dark:bg-amber-950/40"}`}>{log.status}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </section>

            {/* 11. REPORTING ACTION & EXPORT CENTER */}
            <section className="bg-slate-900 text-white dark:bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-md flex items-center justify-between flex-wrap gap-4">
              <div className="space-y-1">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Download className="h-5 w-5 text-blue-400" />
                  Reporting & Export Command Center
                </h3>
                <p className="text-xs text-slate-400">Generate instantly downloaded spreadsheets, reports, or schedule recurring summaries to your inbox.</p>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => triggerToast("Generating PDF report... Download started.")}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition"
                >
                  <FileText className="h-3.5 w-3.5" /> Export PDF
                </button>
                <button
                  onClick={() => triggerToast("Exporting Excel file... Performance_Data.xlsx saved.")}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Export Excel
                </button>
                <button
                  onClick={() => triggerToast("CSV export compiled successfully.")}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition"
                >
                  <Download className="h-3.5 w-3.5" /> Export CSV
                </button>
                <button
                  onClick={() => triggerToast("Scheduled weekly dashboard reports to your email.")}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition"
                >
                  <Mail className="h-3.5 w-3.5" /> Schedule Reports
                </button>
              </div>
            </section>

          </div>
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
                  <p className="text-2xl font-black text-blue-600">{averageRating > 0 ? `${averageRating} ★` : "0.0 ★"}</p>
                  <span className="text-[10px] text-slate-400 block">{totalReviews} total verified feedbacks</span>
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
                      points={`50,110 150,${120 - (averageRating > 0 ? averageRating : 3.5) * 20} 250,${120 - (averageRating > 0 ? averageRating : 3.8) * 20} 350,${120 - (averageRating > 0 ? averageRating : 4.0) * 20} 450,${120 - (averageRating > 0 ? averageRating : 4.2) * 20}`}
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

              <div className="border-t mt-6 pt-4 text-[10px] text-slate-405 italic">
                Competitor ratings sync weekly from public Google Business API indexing. Customize competitor identifiers in branding parameters settings.
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
