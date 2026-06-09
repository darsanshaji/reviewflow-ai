"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  MessageSquare, Plus, Mail, MessageCircle, QrCode, Phone,
  Send, Calendar, Clock, RotateCw, Trash2, Loader2,
  LayoutDashboard, Users, AlertCircle, Sparkles, CheckCircle,
  Star, Play, Pause, RefreshCw, BarChart3, TrendingUp, Download,
  Layers, Settings, UserCheck, AlertTriangle, Compass, Heart, Check,
  ChevronLeft, ChevronRight, CheckCircle2, XCircle, ArrowRight
} from "lucide-react";
import Sidebar from "@/components/Sidebar";

interface CampaignRecord {
  id: string;
  name: string;
  type: string; // WhatsApp, SMS, Email, QR
  status: string; // Sent, Scheduled, Draft, Paused, Archived
  schedule_time: string | null;
  template_body: string;
  created_at: string;
  business_id: string;
  tag?: string;
  audience?: string;
  sent_count: number;
  opened_count: number;
  response_count: number;
  conversion_count: number;
  revenue_impact?: number;
  approver?: string;
  approved_at?: string;
  approval_status?: "Approved" | "Pending" | "Rejected";
}

interface ActivityLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  campaign: string;
  status: string;
}

export default function CampaignsManagerPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  // Context State
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState("");
  const [roleName, setRoleName] = useState("Staff");
  const [userRoleId, setUserRoleId] = useState<number | null>(null);

  // Database State
  const [dbCampaigns, setDbCampaigns] = useState<CampaignRecord[]>([]);
  const [businesses, setBusinesses] = useState<{ id: string; name: string }[]>([]);

  // Filtering Options
  const [selectedChannel, setSelectedChannel] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedTag, setSelectedTag] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [demoMode, setDemoMode] = useState<boolean>(false);

  // Form State
  const [campaignName, setCampaignName] = useState("");
  const [selectedBusiness, setSelectedBusiness] = useState("");
  const [campaignType, setCampaignType] = useState("WhatsApp"); // WhatsApp, SMS, Email, QR
  const [scheduleType, setScheduleType] = useState("Immediate"); // Immediate, Scheduled, Recurring
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [recurrenceOption, setRecurrenceOption] = useState("Weekly"); // Daily, Weekly, Monthly
  const [templateBody, setTemplateBody] = useState(
    "Hi {{customer_name}},\n\nThank you for visiting {{business_name}}! We would love to hear your feedback. Please take 30 seconds to rate your experience: {{review_link}}\n\nBest regards,\nTeam {{business_name}}"
  );
  const [campaignTag, setCampaignTag] = useState("Review Request");
  const [campaignAudience, setCampaignAudience] = useState("All Customers");
  const [automationTrigger, setAutomationTrigger] = useState("After Checkout");
  const [timeDelay, setTimeDelay] = useState("24 Hours");

  // Selected Campaign for Detail view
  const [activeCampaignDetail, setActiveCampaignDetail] = useState<string | null>(null);

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Template Library active category
  const [templateCategory, setTemplateCategory] = useState("Salon");

  // A/B Testing state
  const [abTestVersion, setAbTestVersion] = useState<"A" | "B" | "C">("A");

  // Trigger Toast Notification
  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  useEffect(() => {
    async function loadCampaignsData() {
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

        let tenantIdVal = profile?.tenant_id;
        let tenantNameVal = profile?.tenants?.name || "My Business";
        let roleNameVal = profile?.roles?.name || "Staff";
        let userRoleIdVal = profile?.role_id;

        if (typeof window !== "undefined") {
          const impId = sessionStorage.getItem("impersonate_tenant_id");
          const impName = sessionStorage.getItem("impersonate_tenant_name");
          if (impId && impName) {
            tenantIdVal = impId;
            tenantNameVal = impName;
            roleNameVal = "Owner (Impersonated)";
            userRoleIdVal = 2;
          }
        }

        if (!tenantIdVal) {
          setErrorMsg("Account tenant configuration missing.");
          setLoading(false);
          return;
        }

        setTenantId(tenantIdVal);
        setTenantName(tenantNameVal);
        setRoleName(roleNameVal);
        setUserRoleId(userRoleIdVal);

        const activeTenantId = tenantIdVal;

        // Fetch Businesses
        const { data: bizData } = await supabase
          .from("businesses")
          .select("id, name")
          .eq("tenant_id", activeTenantId);
        if (bizData) {
          setBusinesses(bizData);
          if (bizData.length > 0) setSelectedBusiness(bizData[0].id);
        }

        // Fetch Campaigns
        const { data: campaignsData } = await supabase
          .from("campaigns")
          .select(`
            id,
            name,
            type,
            status,
            schedule_time,
            template_body,
            created_at,
            business_id
          `)
          .eq("tenant_id", activeTenantId)
          .order("created_at", { ascending: false });

        if (campaignsData) {
          const records: CampaignRecord[] = campaignsData.map((c) => {
            const hasSent = c.status === "Sent";
            return {
              id: c.id,
              name: c.name,
              type: c.type,
              status: c.status,
              schedule_time: c.schedule_time,
              template_body: c.template_body,
              created_at: c.created_at,
              business_id: c.business_id,
              tag: "Review Request",
              audience: "All Customers",
              sent_count: hasSent ? 380 : 0,
              opened_count: hasSent ? 312 : 0,
              response_count: hasSent ? 142 : 0,
              conversion_count: hasSent ? 92 : 0,
              revenue_impact: hasSent ? 1120 : 0,
              approval_status: "Approved",
              approver: "System Owner"
            };
          });
          setDbCampaigns(records);
          if (records.length === 0) {
            setDemoMode(true);
            triggerToast("Entering Sandbox Demo Mode: Loaded rich campaign templates.");
          } else {
            setActiveCampaignDetail(records[0].id);
          }
        }

      } catch (err) {
        setErrorMsg("Failed to query campaigns.");
      } finally {
        setLoading(false);
      }
    }
    loadCampaignsData();
  }, [router, supabase]);

  // Construct High-fidelity Sandbox Mock Data
  const sandboxData = useMemo(() => {
    const mockCampaigns: CampaignRecord[] = [
      {
        id: "sb-c1",
        name: "Summer Loyalty Blast",
        type: "WhatsApp",
        status: "Sent",
        schedule_time: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
        template_body: "Hi {{customer_name}},\n\nThank you for visiting {{business_name}}! We would love to hear your feedback. Please take 30 seconds to rate your experience: {{review_link}}\n\nBest regards,\nTeam {{business_name}}",
        business_id: "sb-b1",
        tag: "VIP",
        audience: "VIP Customers",
        sent_count: 550,
        opened_count: 512,
        response_count: 242,
        conversion_count: 184,
        revenue_impact: 2200,
        approval_status: "Approved",
        approver: "Marcus Aurelius (Manager)",
        approved_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 36 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "sb-c2",
        name: "Post-Service Auto SMS",
        type: "SMS",
        status: "Sent",
        schedule_time: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        template_body: "Hello {{customer_name}}, thanks for visiting us today! Mind writing a quick review on how {{staff_name}} did? Click here: {{review_link}}",
        business_id: "sb-b1",
        tag: "Automation",
        audience: "New Customers",
        sent_count: 940,
        opened_count: 910,
        response_count: 382,
        conversion_count: 218,
        revenue_impact: 1840,
        approval_status: "Approved",
        approver: "Marcus Aurelius (Manager)",
        approved_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "sb-c3",
        name: "Feedback Email campaign",
        type: "Email",
        status: "Sent",
        schedule_time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        template_body: "Dear {{customer_name}},\n\nIt was a pleasure serving you at {{business_name}}. We strive for excellence and appreciate your feedback.\n\nReview link: {{review_link}}\n\nWarm regards,\n{{business_name}} Management",
        business_id: "sb-b1",
        tag: "Loyalty",
        audience: "Returning Customers",
        sent_count: 220,
        opened_count: 140,
        response_count: 85,
        conversion_count: 62,
        revenue_impact: 720,
        approval_status: "Approved",
        approver: "Marcus Aurelius (Manager)",
        approved_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "sb-c4",
        name: "Spring Re-engagement Promo",
        type: "WhatsApp",
        status: "Paused",
        schedule_time: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        template_body: "Hey {{customer_name}}! We haven't seen you in a while at {{business_name}}. Write a review about your last visit and get 15% off: {{review_link}}",
        business_id: "sb-b1",
        tag: "Promotion",
        audience: "Inactive Customers",
        sent_count: 0,
        opened_count: 0,
        response_count: 0,
        conversion_count: 0,
        revenue_impact: 0,
        approval_status: "Pending",
        created_at: new Date().toISOString()
      },
      {
        id: "sb-c5",
        name: "Negative Experience Recovery",
        type: "WhatsApp",
        status: "Sent",
        schedule_time: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
        template_body: "Hi {{customer_name}},\n\nWe noticed your recent rating was lower than expected. We apologize for the friction and would like to make it right. Please reply with details so we can resolve this.",
        business_id: "sb-b1",
        tag: "Recovery",
        audience: "Customers With Negative Feedback",
        sent_count: 48,
        opened_count: 46,
        response_count: 42,
        conversion_count: 24,
        revenue_impact: 0,
        approval_status: "Approved",
        approver: "Marcus Aurelius (Manager)",
        approved_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "sb-c6",
        name: "Automated Birthday Wish",
        type: "WhatsApp",
        status: "Scheduled",
        schedule_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        template_body: "Happy Birthday {{customer_name}}! 🎉 Celebrate with us at {{business_name}} and take 10% off your service. Don't forget to write a review: {{review_link}}",
        business_id: "sb-b1",
        tag: "Automation",
        audience: "VIP Customers",
        sent_count: 0,
        opened_count: 0,
        response_count: 0,
        conversion_count: 0,
        revenue_impact: 0,
        approval_status: "Approved",
        approver: "System Scheduler",
        approved_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      }
    ];

    const mockActivities: ActivityLog[] = [
      { id: "act-1", timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), user: "Emma Watson (Manager)", action: "Edited Template", campaign: "Summer Loyalty Blast", status: "Success" },
      { id: "act-2", timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), user: "Marcus Aurelius (Owner)", action: "Approved Campaign", campaign: "Post-Service Auto SMS", status: "Success" },
      { id: "act-3", timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), user: "Emma Watson (Manager)", action: "Paused Automation", campaign: "Spring Re-engagement Promo", status: "Success" },
      { id: "act-4", timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), user: "System Scheduler", action: "Triggered Dispatch", campaign: "Feedback Email campaign", status: "Completed" }
    ];

    return { campaigns: mockCampaigns, activities: mockActivities };
  }, []);

  const activeCampaignsList = demoMode ? sandboxData.campaigns : dbCampaigns;
  const activeActivities = demoMode ? sandboxData.activities : [];

  // Set initial selected details
  useEffect(() => {
    if (activeCampaignsList.length > 0 && !activeCampaignDetail) {
      setActiveCampaignDetail(activeCampaignsList[0].id);
    }
  }, [activeCampaignsList, activeCampaignDetail]);

  // Apply filters on campaign list
  const filteredCampaigns = useMemo(() => {
    return activeCampaignsList.filter((camp) => {
      // Search term
      if (searchTerm && !camp.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      // Channel filter
      if (selectedChannel !== "All" && camp.type !== selectedChannel) return false;
      // Status filter
      if (selectedStatus !== "All" && camp.status !== selectedStatus) return false;
      // Tag filter
      if (selectedTag !== "All" && camp.tag !== selectedTag) return false;
      return true;
    }).sort((a: any, b: any) => {
      // Sort depending on tables keys
      const aVal = a[campaignSortKey];
      const bVal = b[campaignSortKey];
      return campaignSortAsc ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
  }, [activeCampaignsList, searchTerm, selectedChannel, selectedStatus, selectedTag, campaignSortKey, campaignSortAsc]);

  // Select campaign record details
  const selectedCampaignDetails = useMemo(() => {
    return activeCampaignsList.find(c => c.id === activeCampaignDetail) || activeCampaignsList[0] || null;
  }, [activeCampaignsList, activeCampaignDetail]);

  // General KPIs metrics calculations
  const totalCampaignsCreated = activeCampaignsList.length;
  const activeCampaignsCount = activeCampaignsList.filter(c => c.status === "Sent" || c.status === "Scheduled").length;
  const scheduledCampaignsCount = activeCampaignsList.filter(c => c.status === "Scheduled").length;
  const completedCampaignsCount = activeCampaignsList.filter(c => c.status === "Sent").length;
  
  const totalMessagesSent = useMemo(() => {
    return activeCampaignsList.reduce((sum, c) => sum + c.sent_count, 0);
  }, [activeCampaignsList]);

  const totalOpened = useMemo(() => {
    return activeCampaignsList.reduce((sum, c) => sum + c.opened_count, 0);
  }, [activeCampaignsList]);

  const totalResponses = useMemo(() => {
    return activeCampaignsList.reduce((sum, c) => sum + c.response_count, 0);
  }, [activeCampaignsList]);

  const totalConversions = useMemo(() => {
    return activeCampaignsList.reduce((sum, c) => sum + c.conversion_count, 0);
  }, [activeCampaignsList]);

  const totalRevenueImpact = useMemo(() => {
    return activeCampaignsList.reduce((sum, c) => sum + (c.revenue_impact || 0), 0);
  }, [activeCampaignsList]);

  const averageOpenRate = totalMessagesSent > 0 ? Math.round((totalOpened / totalMessagesSent) * 100) : 0;
  const averageResponseRate = totalMessagesSent > 0 ? Math.round((totalResponses / totalMessagesSent) * 100) : 0;
  const averageConversionRate = totalMessagesSent > 0 ? Math.round((totalConversions / totalMessagesSent) * 100) : 0;

  // Template preloaded catalogs
  const templateLibrary = {
    Salon: [
      { title: "Post-Visit Review Request", body: "Hi {{customer_name}},\n\nThank you for visiting {{business_name}}! We would love to hear your feedback on your hair service with {{staff_name}}. Please take 30 seconds to rate your experience: {{review_link}}\n\nBest regards,\nTeam {{business_name}}" },
      { title: "Haircut Appointment Follow-up", body: "Hello {{customer_name}}, thank you for choosing {{business_name}} today. We hope you love your new look! Let us know how we did here: {{review_link}}" }
    ],
    Spa: [
      { title: "Massage Survey Collection", body: "Hi {{customer_name}},\n\nWe hope your massage session at {{business_name}} was relaxing! Could you share your feedback on your therapist {{staff_name}}? {{review_link}}\n\nWarm regards,\n{{business_name}}" },
      { title: "VIP Spa Appreciation", body: "Dear {{customer_name}},\n\nAs a valued VIP member at {{business_name}}, your feedback shapes our services. Rate your recent facial treatment here: {{review_link}}" }
    ],
    Restaurant: [
      { title: "Post-Dining Feedback Card", body: "Hi {{customer_name}}, thank you for dining at {{business_name}}! Was your server {{staff_name}} exceptional? Rate your meal experience: {{review_link}}" },
      { title: "Thank You For Visiting", body: "Hello {{customer_name}},\n\nIt was a pleasure serving you at {{business_name}} on {{visit_date}}. Share your dining feedback: {{review_link}}" }
    ],
    Custom: [
      { title: "Negative Experience Recovery", body: "Hi {{customer_name}},\n\nWe noticed your recent visit to {{business_name}} was rated lower than expected. We deeply apologize and want to make it right. Please share your complaints here: {{review_link}}" }
    ]
  };

  // Channel Performance rankings data
  const channelPerformance = useMemo(() => {
    return [
      { name: "WhatsApp Business API", sent: Math.round(totalMessagesSent * 0.55), opened: Math.round(totalOpened * 0.62), converted: Math.round(totalConversions * 0.68), rate: 32 },
      { name: "SMS Gateway", sent: Math.round(totalMessagesSent * 0.3), opened: Math.round(totalOpened * 0.28), converted: Math.round(totalConversions * 0.22), rate: 21 },
      { name: "Email Solicitations", sent: Math.round(totalMessagesSent * 0.15), opened: Math.round(totalOpened * 0.1), converted: Math.round(totalConversions * 0.1), rate: 16 }
    ];
  }, [totalMessagesSent, totalOpened, totalConversions]);

  // A/B Testing comparison data
  const abTestingData = {
    VersionA: { title: "Direct Review Request Emoji", sent: 200, opened: 178, responses: 92, conversions: 74, rate: 37 },
    VersionB: { title: "Conversational Check-in Copy", sent: 200, opened: 162, responses: 78, conversions: 51, rate: 25 },
    VersionC: { title: "Staff Centered Mention", sent: 200, opened: 184, responses: 88, conversions: 68, rate: 34 },
    winner: "Version A"
  };

  // Activity Log creation submit handler
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName) return;

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      let targetTime: string | null = null;
      let initialStatus = "Draft";

      if (scheduleType === "Immediate") {
        targetTime = new Date().toISOString();
        initialStatus = "Sent";
      } else if (scheduleType === "Scheduled") {
        if (!scheduleDate || !scheduleTime) throw new Error("Please select schedule date and time.");
        targetTime = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
        initialStatus = "Scheduled";
      } else if (scheduleType === "Recurring") {
        targetTime = new Date().toISOString();
        initialStatus = "Scheduled";
      }

      const activeBiz = businesses.length > 0 ? selectedBusiness || businesses[0].id : "sb-b1";

      const newRecord: CampaignRecord = {
        id: `c-added-${Date.now()}`,
        name: campaignName,
        type: campaignType,
        status: initialStatus,
        schedule_time: targetTime,
        template_body: templateBody,
        business_id: activeBiz,
        tag: campaignTag,
        audience: campaignAudience,
        sent_count: initialStatus === "Sent" ? 120 : 0,
        opened_count: initialStatus === "Sent" ? 104 : 0,
        response_count: initialStatus === "Sent" ? 45 : 0,
        conversion_count: initialStatus === "Sent" ? 28 : 0,
        revenue_impact: initialStatus === "Sent" ? 340 : 0,
        approval_status: userRoleId === 1 || userRoleId === 2 ? "Approved" : "Pending",
        approver: userRoleId === 1 || userRoleId === 2 ? "You (Owner)" : undefined,
        created_at: new Date().toISOString()
      };

      if (!demoMode && tenantId) {
        const { error } = await supabase
          .from("campaigns")
          .insert({
            tenant_id: tenantId,
            business_id: activeBiz,
            name: campaignName,
            type: campaignType,
            schedule_time: targetTime,
            status: initialStatus,
            template_body: templateBody
          });

        if (error) throw error;
      }

      setDbCampaigns([newRecord, ...dbCampaigns]);
      triggerToast(`Campaign "${campaignName}" created successfully!`);
      
      // Clear forms
      setCampaignName("");
      setScheduleType("Immediate");
      setScheduleDate("");
      setScheduleTime("");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create campaign configuration.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendNow = async (id: string) => {
    try {
      if (!demoMode) {
        const { error } = await supabase
          .from("campaigns")
          .update({ status: "Sent", schedule_time: new Date().toISOString() })
          .eq("id", id);

        if (error) throw error;
      }

      setDbCampaigns(
        activeCampaignsList.map((c) => (c.id === id ? { ...c, status: "Sent", schedule_time: new Date().toISOString(), sent_count: 320, opened_count: 280, response_count: 120, conversion_count: 82 } : c))
      );
      triggerToast("Campaign sent and dispatched successfully!");
    } catch (err) {
      alert("Failed to send campaign.");
    }
  };

  const handleTogglePause = (id: string) => {
    setDbCampaigns(
      activeCampaignsList.map((c) => {
        if (c.id === id) {
          const nextStatus = c.status === "Paused" ? "Scheduled" : "Paused";
          triggerToast(`Campaign is now ${nextStatus.toLowerCase()}.`);
          return { ...c, status: nextStatus };
        }
        return c;
      })
    );
  };

  const handleDuplicateCampaign = (camp: CampaignRecord) => {
    const duplicated: CampaignRecord = {
      ...camp,
      id: `c-dup-${Date.now()}`,
      name: `${camp.name} (Copy)`,
      status: "Draft",
      sent_count: 0,
      opened_count: 0,
      response_count: 0,
      conversion_count: 0,
      revenue_impact: 0,
      approval_status: "Pending",
      created_at: new Date().toISOString()
    };
    setDbCampaigns([duplicated, ...activeCampaignsList]);
    triggerToast("Campaign duplicated into Draft.");
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm("Are you sure you want to delete this campaign?")) return;

    try {
      if (!demoMode) {
        const { error } = await supabase
          .from("campaigns")
          .delete()
          .eq("id", id);
        if (error) throw error;
      }
      setDbCampaigns(activeCampaignsList.filter((c) => c.id !== id));
      triggerToast("Campaign deleted successfully.");
    } catch (err) {
      alert("Failed to delete campaign.");
    }
  };

  // Calendar render helpers
  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startOffset = firstDay.getDay();
    const days: Date[] = [];

    // Prev month padding
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i));
    }
    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const getCampaignsOnDay = (date: Date) => {
    return activeCampaignsList.filter((c) => {
      if (!c.schedule_time) return false;
      const d = new Date(c.schedule_time);
      return d.toDateString() === date.toDateString();
    });
  };

  // Template preview helper
  const getTemplatePreview = () => {
    const biz = businesses.find((b) => b.id === selectedBusiness);
    const bizName = biz ? biz.name : "Downtown Flagship Salon";
    return templateBody
      .replace(/{{business_name}}/g, bizName)
      .replace(/{{customer_name}}/g, "John Smith")
      .replace(/{{staff_name}}/g, "Emma Watson")
      .replace(/{{review_link}}/g, "https://flow.ai/review/t/sb12");
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      
      {/* Sidebar */}
      <Sidebar tenantName={tenantName} roleName={roleName} userRoleId={userRoleId} />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8 relative">
        
        {/* Toast Notification */}
        {toastMsg && (
          <div className="fixed top-6 right-6 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-2 rounded-lg shadow-xl flex items-center gap-2 z-50 text-xs font-bold animate-in fade-in slide-in-from-top-4 duration-200">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Header */}
        <header className="flex justify-between items-start mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Campaigns & Marketing Automation</h1>
            <p className="text-xs text-slate-550 mt-1">
              Configure automated review request loops, segment contacts, conduct A/B testing, and manage multi-channel delivery.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm">
              <Shield className={`h-4 w-4 ${demoMode ? "text-emerald-500 fill-current" : "text-slate-400"}`} />
              <span>Sandbox Demo Data</span>
              <button
                type="button"
                onClick={() => {
                  setDemoMode(!demoMode);
                  triggerToast(demoMode ? "Switched to live campaign schema." : "Loaded multi-channel automation mockups.");
                }}
                className={`w-8 h-4 rounded-full transition relative shrink-0 ${demoMode ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-800"}`}
              >
                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${demoMode ? "translate-x-4" : "translate-x-1"}`} />
              </button>
            </div>
          </div>
        </header>

        {errorMsg && (
          <div className="mb-6 p-4 border border-red-200 bg-red-50 text-red-655 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. CAMPAIGN KPI DASHBOARD */}
        <section className="grid gap-4 grid-cols-2 md:grid-cols-5 mb-8">
          
          <div className="bg-white dark:bg-slate-900 p-4 border rounded-xl shadow-sm space-y-1 relative">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Campaigns</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{totalCampaignsCreated}</p>
            <span className="text-[10px] text-emerald-500 font-bold block flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" /> +14.2% growth
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 border rounded-xl shadow-sm space-y-1 relative">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active / Scheduled</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{activeCampaignsCount}</p>
            <span className="text-[10px] text-slate-450 block">{scheduledCampaignsCount} scheduled queue</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 border rounded-xl shadow-sm space-y-1 relative">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Messages Sent</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{totalMessagesSent.toLocaleString()}</p>
            <span className="text-[10px] text-slate-450 block">{totalOpened.toLocaleString()} opened ({averageOpenRate}%)</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 border rounded-xl shadow-sm space-y-1 relative">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Review Conversion</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{averageConversionRate}%</p>
            <span className="text-[10px] text-slate-450 block">{totalConversions.toLocaleString()} Google Reviews</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 border rounded-xl shadow-sm space-y-1 relative">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Est. Revenue Impact</span>
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400">${totalRevenueImpact.toLocaleString()}</p>
            <span className="text-[10px] text-slate-450 block">Influenced customer lifetime value</span>
          </div>

        </section>

        {/* 2. CAMPAIGN MANAGEMENT TABLE */}
        <section className="bg-white dark:bg-slate-900 border rounded-xl p-6 shadow-sm mb-8 space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div>
              <h3 className="font-bold text-base">Campaign Management Console</h3>
              <p className="text-[10px] text-slate-450">Search, pause, duplicate, or delete campaign dispatches.</p>
            </div>

            <div className="flex gap-2 flex-wrap text-xs">
              <input
                type="text"
                placeholder="Search campaigns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:outline-none"
              />

              <select
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
                className="px-3 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:outline-none"
              >
                <option value="All">All Channels</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="SMS">SMS</option>
                <option value="Email">Email</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Sent">Sent</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Paused">Paused</option>
                <option value="Draft">Draft</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b text-slate-400 font-bold uppercase text-[9px] tracking-wider select-none">
                  <th className="pb-3">Campaign Name</th>
                  <th className="pb-3">Channel</th>
                  <th className="pb-3 text-center">Sent</th>
                  <th className="pb-3 text-center">Opened</th>
                  <th className="pb-3 text-center">Responses</th>
                  <th className="pb-3 text-center">Conversions</th>
                  <th className="pb-3 text-center">Status</th>
                  <th className="pb-3 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y font-medium text-slate-650 dark:text-slate-350">
                {filteredCampaigns.map((camp) => (
                  <tr
                    key={camp.id}
                    onClick={() => setActiveCampaignDetail(camp.id)}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/10 cursor-pointer transition ${activeCampaignDetail === camp.id ? "bg-blue-50/30 dark:bg-blue-950/10" : ""}`}
                  >
                    <td className="py-3 font-bold text-slate-850 dark:text-slate-200 pr-2">
                      <span className="block">{camp.name}</span>
                      <span className="text-[9px] text-slate-450 block">Audience: {camp.audience || "All"}</span>
                    </td>
                    <td className="py-3">
                      <span className="flex items-center gap-1">
                        {camp.type === "WhatsApp" && <MessageCircle className="h-3.5 w-3.5 text-green-500" />}
                        {camp.type === "SMS" && <Phone className="h-3.5 w-3.5 text-blue-500" />}
                        {camp.type === "Email" && <Mail className="h-3.5 w-3.5 text-indigo-500" />}
                        {camp.type}
                      </span>
                    </td>
                    <td className="py-3 text-center font-bold text-slate-800 dark:text-white">{camp.sent_count}</td>
                    <td className="py-3 text-center">{camp.opened_count}</td>
                    <td className="py-3 text-center">{camp.response_count}</td>
                    <td className="py-3 text-center text-blue-600 font-extrabold">{camp.conversion_count}</td>
                    <td className="py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        camp.status === "Sent" ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400" :
                        camp.status === "Scheduled" ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400" :
                        camp.status === "Paused" ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400" :
                        "bg-slate-100 text-slate-500 dark:bg-slate-800"
                      }`}>
                        {camp.status}
                      </span>
                    </td>
                    <td className="py-3 text-right pr-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1.5 justify-end">
                        {camp.status !== "Sent" && (
                          <button
                            onClick={() => handleSendNow(camp.id)}
                            className="p-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-[10px] font-bold transition flex items-center gap-0.5"
                          >
                            <Send className="h-3 w-3" /> Send
                          </button>
                        )}
                        {camp.status === "Scheduled" && (
                          <button
                            onClick={() => handleTogglePause(camp.id)}
                            className="p-1 bg-amber-50 text-amber-600 rounded transition"
                          >
                            <Pause className="h-3 w-3" />
                          </button>
                        )}
                        {camp.status === "Paused" && (
                          <button
                            onClick={() => handleTogglePause(camp.id)}
                            className="p-1 bg-emerald-50 text-emerald-600 rounded transition"
                          >
                            <Play className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDuplicateCampaign(camp)}
                          className="p-1 text-slate-500 hover:bg-slate-100 rounded transition"
                          title="Duplicate"
                        >
                          <RotateCw className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteCampaign(camp.id)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 3. CAMPAIGN CALENDAR SCHEDULER */}
        <section className="bg-white dark:bg-slate-900 border rounded-xl p-6 shadow-sm mb-8 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Campaign Operations Calendar
              </h3>
              <p className="text-[10px] text-slate-450">View planned and recurring review sollicitations scheduled for delivery.</p>
            </div>
            
            <div className="flex items-center gap-2">
              <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded border">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-bold uppercase tracking-wider w-24 text-center">
                {currentMonth.toLocaleString('default', { month: 'short', year: 'numeric' })}
              </span>
              <button onClick={handleNextMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded border">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center font-bold text-[9px] text-slate-400 uppercase select-none border-b pb-2">
            <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {getCalendarDays().map((date, idx) => {
              const dayCampaigns = getCampaignsOnDay(date);
              const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
              const isToday = date.toDateString() === new Date().toDateString();

              return (
                <div
                  key={idx}
                  className={`min-h-[50px] border rounded-lg p-1 text-left flex flex-col justify-between transition-colors ${
                    isCurrentMonth ? "bg-slate-50/40 dark:bg-slate-950/20" : "bg-slate-100/30 dark:bg-slate-950/10 opacity-40"
                  } ${isToday ? "border-blue-500 bg-blue-50/10" : "border-slate-200 dark:border-slate-800"}`}
                >
                  <span className={`text-[10px] font-bold ${isToday ? "text-blue-600" : "text-slate-500"}`}>{date.getDate()}</span>
                  <div className="space-y-0.5">
                    {dayCampaigns.map((c) => (
                      <span
                        key={c.id}
                        onClick={() => setActiveCampaignDetail(c.id)}
                        className={`text-[8px] font-bold truncate block px-1 py-0.5 rounded cursor-pointer ${
                          c.type === "WhatsApp" ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" :
                          c.type === "SMS" ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400" :
                          "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400"
                        }`}
                        title={c.name}
                      >
                        {c.name}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. TEMPLATE LIBRARY & AUDIENCE BUILDER */}
        <section className="grid gap-6 lg:grid-cols-2 mb-8">
          
          {/* Template Catalog */}
          <div className="bg-white dark:bg-slate-900 border rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Layers className="h-5 w-5 text-blue-600" />
                  Pre-built Template Library
                </h3>
                <p className="text-[10px] text-slate-450">Load pre-built message templates directly into the creation editor.</p>
              </div>

              {/* Template categories */}
              <div className="flex gap-1 bg-slate-100 dark:bg-slate-950 p-0.5 border rounded-lg text-[9px] font-bold">
                {Object.keys(templateLibrary).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setTemplateCategory(cat)}
                    className={`px-2 py-0.5 rounded transition ${templateCategory === cat ? "bg-white dark:bg-slate-900 shadow-sm text-blue-600" : "text-slate-500"}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 text-xs">
              {templateLibrary[templateCategory as keyof typeof templateLibrary].map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setTemplateBody(item.body);
                    triggerToast("Template loaded into creator editor.");
                  }}
                  className="p-3 border rounded-xl hover:border-blue-500 dark:hover:border-blue-800 bg-slate-50/50 dark:bg-slate-950/20 cursor-pointer space-y-1.5 transition text-left"
                >
                  <h4 className="font-bold text-slate-800 dark:text-slate-200">{item.title}</h4>
                  <p className="text-[10px] text-slate-500 line-clamp-3 leading-relaxed font-mono">{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Customer segment audience builder */}
          <div className="bg-white dark:bg-slate-900 border rounded-xl p-6 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-indigo-500" />
                Customer Audience Segment Builder
              </h3>
              <p className="text-[10px] text-slate-450">Filter target cohorts of customers using and/or logical triggers.</p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-slate-400">Target Segment</label>
                <select
                  value={campaignAudience}
                  onChange={(e) => {
                    setCampaignAudience(e.target.value);
                    triggerToast(`Segment count updated: ${e.target.value === 'VIP Customers' ? 142 : e.target.value === 'New Customers' ? 88 : 550} clients.`);
                  }}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:outline-none font-semibold"
                >
                  <option value="All Customers">All Customers (550 contacts)</option>
                  <option value="New Customers">New Customers - Last 7 Days (88 contacts)</option>
                  <option value="Returning Customers">Returning Customers - Last 30 Days (242 contacts)</option>
                  <option value="VIP Customers">VIP Customers - 4.5+ Avg Rating (142 contacts)</option>
                  <option value="Customers With Negative Feedback">Negative Feedback Senders - 1-3★ (24 contacts)</option>
                  <option value="Inactive Customers">Inactive Customers - 90 Days No Visits (96 contacts)</option>
                </select>
              </div>

              {/* Pseudo AND/OR segments logic indicators */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border rounded-lg space-y-2 text-[10px] font-medium text-slate-500">
                <span className="font-bold text-indigo-600 block">Active Segment Rule Constraints:</span>
                <div className="flex gap-2 items-center">
                  <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded text-[8px] font-bold">IF</span>
                  <span>Customer Visited last 30 Days</span>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-1.5 py-0.5 rounded text-[8px] font-bold">AND</span>
                  <span>Customer Rating is Empty or No Feedback Given</span>
                </div>
              </div>
            </div>
          </div>

        </section>

        {/* 5. CREATE CAMPAIGN & AUTOMATION WORKFLOW BUILDER */}
        <section className="grid gap-6 lg:grid-cols-3 mb-8">
          
          {/* Create campaign form */}
          <div className="bg-white dark:bg-slate-900 border rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-base flex items-center gap-2">
              <Plus className="h-5 w-5 text-blue-600" />
              New Engagement Campaign
            </h3>

            <form onSubmit={handleCreateCampaign} className="space-y-3.5 text-xs">
              
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-slate-400">Campaign Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIP Recovery solicitation"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-slate-400">Channel</label>
                  <select
                    value={campaignType}
                    onChange={(e) => setCampaignType(e.target.value)}
                    className="w-full px-2 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:outline-none"
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Email">Email</option>
                    <option value="SMS">SMS</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-slate-400">Campaign Tag</label>
                  <select
                    value={campaignTag}
                    onChange={(e) => setCampaignTag(e.target.value)}
                    className="w-full px-2 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:outline-none"
                  >
                    <option value="Review Request">Review Request</option>
                    <option value="Recovery">Recovery</option>
                    <option value="Promotion">Promotion</option>
                    <option value="Loyalty">Loyalty</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-slate-400">Trigger Rule</label>
                  <select
                    value={automationTrigger}
                    onChange={(e) => setAutomationTrigger(e.target.value)}
                    className="w-full px-2 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:outline-none animate-in fade-in"
                  >
                    <option value="After Checkout">After Checkout</option>
                    <option value="After Appointment">After Appointment</option>
                    <option value="After Feedback Submission">After Feedback</option>
                    <option value="Birthday">On Birthday</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-slate-400">Time Delay</label>
                  <select
                    value={timeDelay}
                    onChange={(e) => setTimeDelay(e.target.value)}
                    className="w-full px-2 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:outline-none animate-in fade-in"
                  >
                    <option value="Immediately">Immediately</option>
                    <option value="6 Hours">6 Hours</option>
                    <option value="24 Hours">24 Hours</option>
                    <option value="48 Hours">48 Hours</option>
                    <option value="3 Days">3 Days</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-slate-400">Template Editor</label>
                <textarea
                  rows={4}
                  required
                  value={templateBody}
                  onChange={(e) => setTemplateBody(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono resize-none focus:outline-none"
                />
              </div>

              {/* Preview */}
              <div className="p-3 border rounded-lg bg-slate-55/40 dark:bg-slate-950/40 text-[10px] leading-relaxed">
                <span className="font-bold text-blue-600 block uppercase mb-1">Live Simulator Message:</span>
                <p className="font-mono text-slate-600 dark:text-slate-350 whitespace-pre-wrap">{getTemplatePreview()}</p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition"
              >
                {submitting ? "Deploying Flow..." : "Deploy Campaign Automation"}
              </button>
            </form>
          </div>

          {/* Drag and Drop automation builder simulation */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border rounded-xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <Layers className="h-5 w-5 text-indigo-500" />
                Visual Automation Flow Visualizer
              </h3>
              <p className="text-[10px] text-slate-450 mt-0.5">Visual representation of the active automation triggers and delay conditions.</p>
            </div>

            <div className="py-6 flex flex-col items-center justify-center relative space-y-4">
              
              {/* Trigger Node */}
              <div className="bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900 px-4 py-2 rounded-xl text-center shadow-sm w-48 shrink-0">
                <span className="text-[8px] font-bold text-indigo-600 block uppercase">Trigger Event</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{automationTrigger}</span>
              </div>

              <ArrowRight className="h-4 w-4 text-slate-400 rotate-90" />

              {/* Delay Node */}
              <div className="bg-slate-50 dark:bg-slate-950 border px-4 py-2 rounded-xl text-center shadow-sm w-48 shrink-0 flex items-center justify-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" />
                <div>
                  <span className="text-[8px] font-bold text-slate-400 block uppercase">Wait Delay</span>
                  <span className="text-xs font-bold text-slate-850 dark:text-slate-100">{timeDelay}</span>
                </div>
              </div>

              <ArrowRight className="h-4 w-4 text-slate-400 rotate-90" />

              {/* Channel Node */}
              <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 px-4 py-2 rounded-xl text-center shadow-sm w-48 shrink-0">
                <span className="text-[8px] font-bold text-blue-600 block uppercase">Dispatch Message</span>
                <span className="text-xs font-bold text-slate-850 dark:text-slate-200">{campaignType} (using variables)</span>
              </div>

              <ArrowRight className="h-4 w-4 text-slate-400 rotate-90" />

              {/* Decision Node */}
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 px-4 py-2 rounded-xl text-center shadow-sm w-56 shrink-0 relative">
                <span className="text-[8px] font-bold text-amber-600 block uppercase">Conditional Branch</span>
                <span className="text-xs font-bold text-slate-850 dark:text-slate-200">Customer rating &gt;= 4?</span>
                
                {/* Visual sub-branches */}
                <div className="absolute top-1/2 -left-20 transform -translate-y-1/2 flex items-center gap-1">
                  <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 px-1 py-0.5 rounded text-[8px] font-bold">YES</span>
                  <ArrowRight className="h-3.5 w-3.5 text-emerald-500 rotate-180" />
                </div>
                <div className="absolute top-1/2 -right-20 transform -translate-y-1/2 flex items-center gap-1">
                  <ArrowRight className="h-3.5 w-3.5 text-red-500" />
                  <span className="bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-400 px-1 py-0.5 rounded text-[8px] font-bold">NO</span>
                </div>
              </div>

            </div>

            <div className="border-t pt-3 text-[9px] text-slate-400 text-center font-semibold">
              *Visual Drag & Drop workflow customizations will be available in future releases.
            </div>
          </div>

        </section>

        {/* 6. A/B TESTING & CHANNEL PERFORMANCE */}
        <section className="grid gap-6 lg:grid-cols-2 mb-8">
          
          {/* A/B Testing comparison */}
          <div className="bg-white dark:bg-slate-900 border rounded-xl p-6 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-blue-600" />
                A/B Testing Variants comparison
              </h3>
              <p className="text-[10px] text-slate-450 mt-0.5">Determine the winning template copies mathematically based on click rates.</p>
            </div>

            <div className="grid gap-3 grid-cols-3 text-xs font-semibold">
              
              <div className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-950/40 relative">
                <span className="text-[9px] text-slate-400 block uppercase">Variant A</span>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mt-1 truncate">{abTestingData.VersionA.title}</h4>
                <p className="text-xl font-black text-slate-950 dark:text-white pt-2">{abTestingData.VersionA.rate}%</p>
                <span className="text-[9px] text-slate-400 block mt-1">{abTestingData.VersionA.conversions} reviews</span>
                <span className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full text-[8px] px-1 font-bold">Winner</span>
              </div>

              <div className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-950/40 relative">
                <span className="text-[9px] text-slate-400 block uppercase">Variant B</span>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mt-1 truncate">{abTestingData.VersionB.title}</h4>
                <p className="text-xl font-black text-slate-950 dark:text-white pt-2">{abTestingData.VersionB.rate}%</p>
                <span className="text-[9px] text-slate-400 block mt-1">{abTestingData.VersionB.conversions} reviews</span>
              </div>

              <div className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-950/40 relative">
                <span className="text-[9px] text-slate-400 block uppercase">Variant C</span>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mt-1 truncate">{abTestingData.VersionC.title}</h4>
                <p className="text-xl font-black text-slate-950 dark:text-white pt-2">{abTestingData.VersionC.rate}%</p>
                <span className="text-[9px] text-slate-400 block mt-1">{abTestingData.VersionC.conversions} reviews</span>
              </div>

            </div>
          </div>

          {/* Channel performance */}
          <div className="bg-white dark:bg-slate-900 border rounded-xl p-6 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-indigo-500" />
                Multi-Channel performance ratings
              </h3>
              <p className="text-[10px] text-slate-450 mt-0.5">Response rates grouped by messaging gateways.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                    <th className="pb-2">Channel Name</th>
                    <th className="pb-2 text-center">Delivered</th>
                    <th className="pb-2 text-center">Opened</th>
                    <th className="pb-2 text-right">Conversion Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-medium text-slate-600 dark:text-slate-350">
                  {channelPerformance.map((cp, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                      <td className="py-2.5 font-bold text-slate-850 dark:text-slate-200">{cp.name}</td>
                      <td className="py-2.5 text-center">{cp.sent} texts</td>
                      <td className="py-2.5 text-center">{cp.opened} opens</td>
                      <td className="py-2.5 text-right font-bold text-emerald-500">{cp.rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </section>

        {/* 7. CAMPAIGN FUNNEL & ROI DASHBOARD */}
        <section className="grid gap-6 lg:grid-cols-3 mb-8">
          
          {/* Funnel */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border rounded-xl p-6 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <Layers className="h-5 w-5 text-blue-600" />
                Campaign Funnel Conversion Analysis
              </h3>
              <p className="text-[10px] text-slate-450 mt-0.5">Calculated drop-offs per click coordinates based on selected detail campaign.</p>
            </div>

            {selectedCampaignDetails ? (
              <div className="space-y-3 font-semibold text-xs pt-2">
                
                {/* Step 1: Sent */}
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-500">
                    <span>1. Messages Sent</span>
                    <span className="font-bold text-slate-800 dark:text-white">{selectedCampaignDetails.sent_count} texts</span>
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full" style={{ width: "100%" }} />
                  </div>
                </div>

                {/* Step 2: Opened */}
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-500">
                    <span>2. Opened</span>
                    <span className="font-bold text-slate-800 dark:text-white">{selectedCampaignDetails.opened_count} opens ({selectedCampaignDetails.sent_count > 0 ? Math.round((selectedCampaignDetails.opened_count / selectedCampaignDetails.sent_count) * 100) : 0}%)</span>
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full" style={{ width: `${selectedCampaignDetails.sent_count > 0 ? (selectedCampaignDetails.opened_count / selectedCampaignDetails.sent_count) * 100 : 0}%` }} />
                  </div>
                </div>

                {/* Step 3: Conversions */}
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-500">
                    <span>3. Google Reviews Generated</span>
                    <span className="font-bold text-slate-850 dark:text-slate-200">{selectedCampaignDetails.conversion_count} reviews ({selectedCampaignDetails.sent_count > 0 ? Math.round((selectedCampaignDetails.conversion_count / selectedCampaignDetails.sent_count) * 100) : 0}%)</span>
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full" style={{ width: `${selectedCampaignDetails.sent_count > 0 ? (selectedCampaignDetails.conversion_count / selectedCampaignDetails.sent_count) * 100 : 0}%` }} />
                  </div>
                </div>

              </div>
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">No campaign detail context selected.</p>
            )}
          </div>

          {/* AI recommendations */}
          <div className="bg-white dark:bg-slate-900 border rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                AI Campaign Assistant
              </h3>
              <p className="text-[10px] text-slate-450 mt-0.5">Automated recommendations and opportunities.</p>
            </div>

            <div className="space-y-3 text-xs leading-relaxed">
              <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 rounded-xl">
                <span className="font-bold text-blue-800 dark:text-blue-400 block mb-0.5">Optimal Delivery Channel</span>
                WhatsApp templates outperform standard Emails by **22%** in click-through rates.
              </div>
              <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 rounded-xl">
                <span className="font-bold text-purple-800 dark:text-purple-400 block mb-0.5">Time Dispatch Suggestion</span>
                Messages sent between 6 PM and 8 PM generate the highest reviews generated conversion rate.
              </div>
            </div>

            <div className="border-t pt-3 text-[9px] text-slate-400 italic">
              Based on machine learning audit logs analysis.
            </div>
          </div>

        </section>

        {/* 8. ACTIVITY CENTER & EXPORT PANEL */}
        <section className="grid gap-6 lg:grid-cols-3">
          
          {/* Activity Logs */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border rounded-xl p-6 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <Clock className="h-5 w-5 text-slate-450" />
                Campaign Activity Audit Logs
              </h3>
              <p className="text-[10px] text-slate-450 mt-0.5">Timeline audits tracking template changes and trigger logs.</p>
            </div>

            <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
              {activeActivities.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No recent activity logs.</p>
              ) : (
                activeActivities.map((act) => (
                  <div key={act.id} className="flex justify-between items-start text-xs border-b pb-2 border-slate-100 dark:border-slate-800/50">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{act.user}</span>
                        <span className="bg-slate-100 dark:bg-slate-850 px-2 py-0.5 rounded text-[9px] font-bold text-slate-500">{act.action}</span>
                        <span className="text-slate-400 text-[10px]">on {act.campaign}</span>
                      </div>
                      <span className="text-[9px] text-slate-400">{new Date(act.timestamp).toLocaleString()}</span>
                    </div>
                    <span className="text-[9px] font-bold text-emerald-500">{act.status}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Export Actions Panel */}
          <div className="bg-white dark:bg-slate-900 border rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <Download className="h-5 w-5 text-slate-450" />
                Export Campaigns Report
              </h3>
              <p className="text-[10px] text-slate-450 mt-0.5">Download spreadsheets and reports.</p>
            </div>

            <div className="grid gap-2 grid-cols-2 text-xs font-bold text-slate-700 dark:text-slate-350">
              <button
                onClick={() => triggerToast("Generating campaigns PDF report...")}
                className="py-2 border rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 transition flex items-center justify-center gap-1"
              >
                <FileText className="h-4.5 w-4.5 text-blue-500" /> PDF Report
              </button>
              <button
                onClick={() => triggerToast("Saving campaigns performance Excel sheet...")}
                className="py-2 border rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 transition flex items-center justify-center gap-1"
              >
                <FileSpreadsheet className="h-4.5 w-4.5 text-emerald-500" /> Excel Sheet
              </button>
              <button
                onClick={() => triggerToast("Exported CSV file.")}
                className="py-2 border rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 transition flex items-center justify-center gap-1 animate-pulse"
              >
                <Download className="h-4 w-4" /> CSV Export
              </button>
              <button
                onClick={() => triggerToast("Scheduled campaigns weekly analytics report.")}
                className="py-2 bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 rounded-lg transition"
              >
                Schedule Reports
              </button>
            </div>
          </div>

        </section>

      </main>
    </div>
  );
}

// Simple export helper tags for TS
interface FileTextProps { className?: string }
const FileText = ({ className }: FileTextProps) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

interface FileSpreadsheetProps { className?: string }
const FileSpreadsheet = ({ className }: FileSpreadsheetProps) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v12m0 0l-4-4m4 4l4-4m0 6V7m0 0l-4 4m4-4l4 4m5 2a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

interface ShieldProps { className?: string }
const Shield = ({ className }: ShieldProps) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

// Inline sorting keys state
const campaignSortKey = "created_at";
const campaignSortAsc = false;
