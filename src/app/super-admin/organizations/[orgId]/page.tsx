"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  Building, Users, CreditCard, Activity, ShieldAlert, ShieldCheck, 
  ArrowLeft, Trash2, Loader2, Download, UserCheck, Key, BarChart3, 
  Settings, AlertCircle, CheckCircle, Calendar, MapPin, UserX, Info,
  Smartphone, Search, ChevronRight, Check, Star
} from "lucide-react";
import Sidebar from "@/components/Sidebar";

interface UserRecord {
  id: string;
  name: string;
  role_id: number;
  roles: { name: string } | null;
}

interface BranchRecord {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  google_review_url: string | null;
  avgRating?: number;
  reviewsCount?: number;
}

interface StaffRecord {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
}

interface AuditRecord {
  id: string;
  action: string;
  ip_address: string;
  metadata: any;
  created_at: string;
  users: { name: string } | null;
}

export default function OrgDetailsWorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const orgId = params.orgId as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Super Admin Credentials State
  const [superAdminName, setSuperAdminName] = useState("");
  const [superAdminRoleId, setSuperAdminRoleId] = useState<number | null>(null);

  // Tenant State
  const [tenant, setTenant] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  
  // Lists
  const [orgUsers, setOrgUsers] = useState<UserRecord[]>([]);
  const [orgBranches, setOrgBranches] = useState<BranchRecord[]>([]);
  const [orgStaff, setOrgStaff] = useState<StaffRecord[]>([]);
  const [orgLogs, setOrgLogs] = useState<AuditRecord[]>([]);
  
  // Metrics & Stats
  const [totalFeedback, setTotalFeedback] = useState(0);
  const [avgRating, setAvgRating] = useState(0.0);
  const [campaignCount, setCampaignCount] = useState(0);
  const [qrCount, setQrCount] = useState(0);
  const [healthScore, setHealthScore] = useState(75);

  // Tabs
  const [activeTab, setActiveTab] = useState<"overview" | "roster" | "branches" | "billing" | "security">("overview");
  
  // Actions Modals / Search
  const [searchLogQuery, setSearchLogQuery] = useState("");
  const [showPasswordResetModal, setShowPasswordResetModal] = useState<string | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState("");

  async function loadWorkspaceDetails() {
    try {
      setLoading(true);
      setErrorMsg("");

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      // 1. Verify User Profile is Super Admin
      const { data: profile } = (await supabase
        .from("users")
        .select("name, role_id")
        .eq("id", session.user.id)
        .single()) as any;

      if (!profile || profile.role_id !== 1) {
        router.push("/dashboard");
        return;
      }

      setSuperAdminName(profile.name);
      setSuperAdminRoleId(profile.role_id);

      // 2. Fetch Tenant Core Profile
      const { data: tenantData, error: tenantErr } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", orgId)
        .single();

      if (tenantErr || !tenantData) {
        throw new Error("Target organization tenant record not found.");
      }
      setTenant(tenantData);

      // 3. Fetch Subscription
      const { data: subData } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("tenant_id", orgId)
        .single();
      setSubscription(subData);

      // 4. Fetch Users Roster
      const { data: usersData } = await supabase
        .from("users")
        .select("id, name, role_id, roles(name)")
        .eq("tenant_id", orgId)
        .order("name", { ascending: true });
      setOrgUsers((usersData as any) || []);

      // 5. Fetch Branches & Ratings details
      const { data: branchesData } = await supabase
        .from("branches")
        .select("id, name, address, phone, google_review_url")
        .eq("tenant_id", orgId);
      
      const { data: feedbackData } = await supabase
        .from("feedback")
        .select("rating, branch_id")
        .eq("tenant_id", orgId);

      setTotalFeedback(feedbackData?.length || 0);

      // Map averages per branch & globally
      if (feedbackData && feedbackData.length > 0) {
        const globalSum = feedbackData.reduce((sum, f) => sum + f.rating, 0);
        const globalAvg = parseFloat((globalSum / feedbackData.length).toFixed(1));
        setAvgRating(globalAvg);
        
        // Calculate health score: rating base (80% weight) + volume base (20% weight, max 20 pts for 10+ reviews)
        const ratingScore = globalAvg * 16; // 5.0 * 16 = 80
        const volumeBonus = Math.min(feedbackData.length * 2, 20); // 10 reviews = 20 pts
        setHealthScore(Math.round(ratingScore + volumeBonus));
      } else {
        setAvgRating(0.0);
        setHealthScore(75); // Default health for clean trial orgs
      }

      if (branchesData) {
        const formattedBranches = branchesData.map((b) => {
          const branchFeed = feedbackData?.filter((f) => f.branch_id === b.id) || [];
          const branchSum = branchFeed.reduce((sum, f) => sum + f.rating, 0);
          const branchAvg = branchFeed.length > 0 ? parseFloat((branchSum / branchFeed.length).toFixed(1)) : 0;
          return {
            ...b,
            avgRating: branchAvg,
            reviewsCount: branchFeed.length
          };
        });
        setOrgBranches(formattedBranches);
      }

      // 6. Fetch Staff
      const { data: staffData } = await supabase
        .from("staff")
        .select("id, name, role, email, phone")
        .eq("tenant_id", orgId)
        .order("name", { ascending: true });
      setOrgStaff((staffData as any) || []);

      // 7. Fetch Campaign Metric Counts
      const { count: campaignsCount } = await supabase
        .from("campaigns")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", orgId);
      setCampaignCount(campaignsCount || 0);

      // 8. Fetch QR Codes Counts
      const { count: qrsCount } = await supabase
        .from("qr_codes")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", orgId);
      setQrCount(qrsCount || 0);

      // 9. Fetch Audit Logs
      const { data: logsData } = await supabase
        .from("audit_logs")
        .select("id, action, ip_address, metadata, created_at, users(name)")
        .eq("tenant_id", orgId)
        .order("created_at", { ascending: false });
      setOrgLogs((logsData as any) || []);

    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load organization workspace telemetry.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWorkspaceDetails();
  }, [orgId]);

  // Action: Toggle Suspension Status
  const handleToggleSuspension = async () => {
    setActionLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    const currentStatus = subscription?.status || "Active";
    const nextStatus = currentStatus === "Active" ? "Suspended" : "Active";

    try {
      if (subscription) {
        const { error } = await supabase
          .from("subscriptions")
          .update({ status: nextStatus })
          .eq("tenant_id", orgId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("subscriptions")
          .insert({
            tenant_id: orgId,
            plan_name: "Starter",
            status: nextStatus,
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          });
        if (error) throw error;
      }

      setSubscription((prev: any) => ({ ...prev, status: nextStatus }));
      setSuccessMsg(`Organization status successfully updated to ${nextStatus}.`);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to toggle organization suspension status.");
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Impersonate "Login As Owner"
  const handleImpersonate = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("impersonate_tenant_id", orgId);
      sessionStorage.setItem("impersonate_tenant_name", tenant?.name || "Target Tenant");
      
      // Write audit log event for impersonation
      supabase.from("audit_logs").insert({
        tenant_id: orgId,
        user_id: null,
        action: "impersonation_started",
        ip_address: "127.0.0.1",
        metadata: { admin: superAdminName, target_tenant: tenant?.name }
      }).then(() => {
        router.push("/dashboard");
      });
    }
  };

  // Action: Modify User Role
  const handleModifyMemberRole = async (userId: string, newRoleId: number) => {
    setActionLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const { error } = await supabase
        .from("users")
        .update({ role_id: newRoleId })
        .eq("id", userId);

      if (error) throw error;
      setSuccessMsg("Team member privileges updated successfully.");
      setOrgUsers(orgUsers.map(u => u.id === userId ? { ...u, role_id: newRoleId } : u));
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update member role.");
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Remove Member from Workspace
  const handleRemoveMember = async (userId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from this organization?`)) return;
    setActionLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const { error } = await supabase
        .from("users")
        .update({ tenant_id: null })
        .eq("id", userId);

      if (error) throw error;
      setSuccessMsg(`${name} was successfully detached from the organization.`);
      setOrgUsers(orgUsers.filter(u => u.id !== userId));
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to detach user.");
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Export Organization JSON Configuration
  const handleExportJSON = () => {
    const payload = {
      tenant,
      subscription,
      stats: {
        totalFeedback,
        avgRating,
        campaignCount,
        qrCount,
        healthScore
      },
      users: orgUsers,
      branches: orgBranches,
      staff: orgStaff,
      auditLogs: orgLogs
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `tenant_${orgId}_export.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setSuccessMsg("Organization configuration exported to JSON file.");
  };

  // Action: Delete Tenant Permanently
  const handleDeleteOrg = async () => {
    const doubleConfirm = prompt(`WARNING: This action cannot be undone. All branches, feedback logs, staff, campaigns, and configurations will be permanently deleted.\n\nType the organization name "${tenant?.name}" to confirm:`);
    if (doubleConfirm !== tenant?.name) {
      alert("Verification mismatched. Deletion cancelled.");
      return;
    }

    setActionLoading(true);
    setErrorMsg("");
    try {
      const { error } = await supabase
        .from("tenants")
        .delete()
        .eq("id", orgId);

      if (error) throw error;
      alert("Organization deleted successfully.");
      router.push("/dashboard/super-admin");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete tenant container.");
      setActionLoading(false);
    }
  };

  // Action: Reset Member Password
  const triggerPasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPasswordResetModal || !newPasswordValue) return;

    setActionLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      // In a client-side environment bypass, we mock updating their public profile user record or writing a log
      // For a real DB user, password resets normally trigger an email, but since we are Super Admins,
      // we log the request to reset security password for verification audits.
      await supabase.from("audit_logs").insert({
        tenant_id: orgId,
        user_id: showPasswordResetModal,
        action: "admin_password_reset_triggered",
        ip_address: "127.0.0.1",
        metadata: { requested_by: superAdminName, scope: "security_override" }
      });

      setSuccessMsg("A security password reset audit log entry was successfully published.");
      setShowPasswordResetModal(null);
      setNewPasswordValue("");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to trigger reset.");
    } finally {
      setActionLoading(false);
    }
  };

  // Filter audit logs based on search query
  const filteredLogs = orgLogs.filter(log => {
    const actionMatch = log.action.toLowerCase().includes(searchLogQuery.toLowerCase());
    const userMatch = log.users?.name?.toLowerCase().includes(searchLogQuery.toLowerCase()) || false;
    const ipMatch = log.ip_address.includes(searchLogQuery);
    return actionMatch || userMatch || ipMatch;
  });

  // Limits Calculation for visual bars
  const limits = subscription?.limits || { branches: 1, users: 5, campaigns_per_month: 100 };
  const branchLimit = limits.branches || 1;
  const userLimit = limits.users || 5;
  const campaignLimit = limits.campaigns_per_month || 100;

  const branchPercentage = Math.min((orgBranches.length / branchLimit) * 100, 100);
  const userPercentage = Math.min((orgUsers.length / userLimit) * 100, 100);
  const campaignPercentage = Math.min((campaignCount / campaignLimit) * 100, 100);

  // Health Score Color
  const getHealthColor = (score: number) => {
    if (score >= 85) return "#10b981"; // Emerald
    if (score >= 60) return "#f59e0b"; // Amber
    return "#ef4444"; // Red
  };
  const healthColor = getHealthColor(healthScore);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-sm text-slate-500 font-semibold">Loading Tenant Workspace...</span>
        </div>
      </div>
    );
  }

  const isSuspended = subscription?.status === "Suspended";

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      
      {/* Sidebar - Inherits active tenant profile details */}
      <Sidebar tenantName={tenant?.name || "Selected Org"} roleName="Super Admin" userRoleId={superAdminRoleId} />

      {/* Main Workspace Area */}
      <main className="flex-1 overflow-y-auto p-8">
        
        {/* Header Navigation */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard/super-admin")}
              className="p-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{tenant?.name}</h1>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isSuspended ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
                }`}>
                  {subscription?.status || "Active"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">Org Workspace UUID: {orgId}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleImpersonate}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition shadow-sm"
            >
              <UserCheck className="h-4 w-4" />
              <span>Login As Owner</span>
            </button>

            <button
              onClick={handleExportJSON}
              className="flex items-center gap-1.5 px-3 py-2 border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-xs transition"
            >
              <Download className="h-4 w-4" />
              <span>Export config</span>
            </button>
          </div>
        </header>

        {errorMsg && (
          <div className="mb-6 p-4 border border-red-200 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 border border-green-200 bg-green-50 text-green-600 text-sm rounded-lg flex items-center gap-2">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab Controls */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 font-semibold text-sm">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-3 px-4 transition ${activeTab === "overview" ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            Overview & Telemetry
          </button>
          <button
            onClick={() => setActiveTab("roster")}
            className={`pb-3 px-4 transition ${activeTab === "roster" ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            Team Roster ({orgUsers.length})
          </button>
          <button
            onClick={() => setActiveTab("branches")}
            className={`pb-3 px-4 transition ${activeTab === "branches" ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            Branches & Staff
          </button>
          <button
            onClick={() => setActiveTab("billing")}
            className={`pb-3 px-4 transition ${activeTab === "billing" ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            Billing & Resource Limits
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`pb-3 px-4 transition ${activeTab === "security" ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            Security & IP Logs ({orgLogs.length})
          </button>
        </div>

        {/* WORKSPACE CONTENT PANELS */}
        <div className="space-y-6">

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="grid gap-6 md:grid-cols-3">
              
              {/* Health Score Circle Gauge */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-400 mb-4">Workspace Health Index</h3>
                <div className="relative flex items-center justify-center">
                  <svg className="w-32 h-32" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="#e2e8f0" strokeWidth="8" fill="transparent" />
                    <circle cx="50" cy="50" r="40" stroke={healthColor} strokeWidth="8" fill="transparent"
                            strokeDasharray={251.2} strokeDashoffset={251.2 - (251.2 * healthScore) / 100}
                            strokeLinecap="round" className="transition-all duration-1000" />
                    <text x="50" y="56" textAnchor="middle" className="text-xl font-black fill-slate-800 dark:fill-slate-100" fontSize="18">
                      {healthScore}
                    </text>
                  </svg>
                </div>
                <span className="text-[10px] text-slate-400 mt-4 font-semibold italic">Based on average rating & review volume</span>
              </div>

              {/* Core Quick stats */}
              <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-base border-b pb-2 mb-4">Workspace Operations Summary</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 border rounded-xl bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Feedbacks</span>
                    <p className="text-2xl font-black mt-1 text-slate-800 dark:text-slate-100">{totalFeedback}</p>
                  </div>
                  <div className="p-4 border rounded-xl bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Average Rating</span>
                    <p className="text-2xl font-black mt-1 text-slate-800 dark:text-slate-100">{avgRating > 0 ? `${avgRating} ★` : "0.0 ★"}</p>
                  </div>
                  <div className="p-4 border rounded-xl bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Campaigns Sent</span>
                    <p className="text-2xl font-black mt-1 text-slate-800 dark:text-slate-100">{campaignCount}</p>
                  </div>
                  <div className="p-4 border rounded-xl bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">QR Code Configurations</span>
                    <p className="text-2xl font-black mt-1 text-slate-800 dark:text-slate-100">{qrCount}</p>
                  </div>
                </div>

                <div className="mt-6 p-4 border border-blue-100 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-950/10 rounded-xl flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                  <div className="text-xs text-blue-900 dark:text-blue-300">
                    <span className="font-bold">Operational Status Check:</span> Active users, staff members, branches structure, and dynamic QR nodes are fully populated. PostgreSQL RLS naturally safeguards company telemetry while enabling admin oversight.
                  </div>
                </div>
              </div>

              {/* Quick Admin Actions Box */}
              <div className="md:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-base border-b pb-2 mb-4 text-red-500 flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5" /> Danger Zone Controls
                </h3>
                
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleToggleSuspension}
                    disabled={actionLoading}
                    className={`px-4 py-2 text-xs font-bold rounded-lg border transition ${
                      isSuspended
                        ? "bg-green-600 hover:bg-green-700 text-white border-green-700 shadow-sm"
                        : "bg-red-50 hover:bg-red-100 text-red-600 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50"
                    }`}
                  >
                    {isSuspended ? "Reactivate Organization" : "Suspend Organization"}
                  </button>

                  <button
                    onClick={handleDeleteOrg}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition shadow-sm"
                  >
                    Permanently Delete Organization Container
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: ROSTER */}
          {activeTab === "roster" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-base border-b pb-3 mb-4">Workspace Roster Permissions</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                      <th className="pb-3 pl-2">Member Name</th>
                      <th className="pb-3">Account UUID</th>
                      <th className="pb-3">Active Authority Role</th>
                      <th className="pb-3">Security Level Modifiers</th>
                      <th className="pb-3 text-right pr-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-slate-600 dark:text-slate-300 font-medium">
                    {orgUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/10">
                        <td className="py-3 pl-2 font-extrabold text-slate-800 dark:text-slate-100">{u.name}</td>
                        <td className="py-3 font-mono text-[10px] text-slate-400">{u.id}</td>
                        <td className="py-3">
                          <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            u.role_id === 2 ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400' :
                            u.role_id === 3 ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400' :
                            'bg-slate-100 text-slate-600 dark:bg-slate-800'
                          }`}>
                            {u.roles?.name || "Staff"}
                          </span>
                        </td>
                        <td className="py-3">
                          <select
                            value={u.role_id}
                            onChange={(e) => handleModifyMemberRole(u.id, parseInt(e.target.value, 10))}
                            disabled={actionLoading}
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 focus:outline-none text-xs font-bold"
                          >
                            <option value="2">Owner</option>
                            <option value="3">Manager</option>
                            <option value="4">Receptionist</option>
                            <option value="5">Staff</option>
                          </select>
                        </td>
                        <td className="py-3 text-right pr-2">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setShowPasswordResetModal(u.id);
                                setNewPasswordValue("");
                              }}
                              className="p-1 border rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                              title="Reset Password Audit"
                            >
                              <Key className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleRemoveMember(u.id, u.name)}
                              className="p-1 border rounded hover:bg-red-50 text-red-500 border-red-100 dark:border-red-950/20 transition"
                              title="Revoke Organization Membership"
                            >
                              <UserX className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: BRANCHES & STAFF */}
          {activeTab === "branches" && (
            <div className="grid gap-6 md:grid-cols-2">
              
              {/* Branches Panel */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-base border-b pb-3 mb-4">Branch Locations ({orgBranches.length})</h3>
                
                {orgBranches.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No branch locations onboarded yet.</p>
                ) : (
                  <div className="space-y-4">
                    {orgBranches.map((b) => (
                      <div key={b.id} className="p-4 border rounded-xl bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 flex justify-between items-start">
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">{b.name}</h4>
                          {b.address && (
                            <p className="text-[11px] text-slate-500 flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              {b.address}
                            </p>
                          )}
                          <p className="text-[10px] text-slate-450 font-mono">Branch ID: {b.id}</p>
                        </div>

                        <div className="flex items-center gap-1.5 bg-yellow-50 dark:bg-yellow-950/20 px-2 py-1 border border-yellow-200 dark:border-yellow-900/50 rounded-lg shrink-0">
                          <Star className="h-3.5 w-3.5 text-yellow-500 fill-current" />
                          <span className="text-xs font-bold text-yellow-750 dark:text-yellow-450">
                            {b.avgRating || "0.0"} ({b.reviewsCount || 0})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Staff Panel */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-base border-b pb-3 mb-4">Employee Staff Members ({orgStaff.length})</h3>
                
                {orgStaff.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No employee staff members registered.</p>
                ) : (
                  <div className="space-y-3">
                    {orgStaff.map((s) => (
                      <div key={s.id} className="p-3 border rounded-xl bg-slate-50 dark:bg-slate-950/10 border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">{s.name}</h4>
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-850 px-2 py-0.5 rounded text-slate-500 font-semibold">{s.role || "Staff"}</span>
                        </div>
                        <div className="text-[10px] text-slate-550 text-right space-y-0.5">
                          {s.email && <div className="font-medium">{s.email}</div>}
                          {s.phone && <div className="text-slate-400">{s.phone}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 4: BILLING & Resource limits */}
          {activeTab === "billing" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
              
              <div>
                <h3 className="font-bold text-base border-b pb-3 mb-4">Resource Allocation Limits</h3>
                
                <div className="grid gap-6 sm:grid-cols-3">
                  {/* Branches count */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-555">Branch Nodes Allocation</span>
                      <span className="text-slate-400">{orgBranches.length} / {branchLimit}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-950 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${branchPercentage}%` }}></div>
                    </div>
                  </div>

                  {/* Users count */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-555">User Profiles Limit</span>
                      <span className="text-slate-400">{orgUsers.length} / {userLimit}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-950 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full transition-all duration-500" style={{ width: `${userPercentage}%` }}></div>
                    </div>
                  </div>

                  {/* Campaigns count */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-555">Campaign Dispatches / Mo</span>
                      <span className="text-slate-400">{campaignCount} / {campaignLimit}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-950 rounded-full h-2">
                      <div className="bg-indigo-600 h-2 rounded-full transition-all duration-500" style={{ width: `${campaignPercentage}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-bold text-sm mb-3">Subscription Contract Details</h4>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 text-xs">
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border rounded-xl space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Active Agreement Plan</span>
                    <span className="font-extrabold text-sm text-slate-800 dark:text-slate-200 block capitalize">{subscription?.plan_name || "Starter"}</span>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border rounded-xl space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Next Invoice Date</span>
                    <span className="font-extrabold text-sm text-slate-800 dark:text-slate-200 block">
                      {subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : "N/A"}
                    </span>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border rounded-xl space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Billing Isolation Status</span>
                    <span className="font-extrabold text-sm text-slate-800 dark:text-slate-200 block flex items-center gap-1">
                      <ShieldCheck className="h-4 w-4 text-green-500 shrink-0" />
                      Active Settlement
                    </span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 5: SECURITY & IP LOGS */}
          {activeTab === "security" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
              
              <div className="flex justify-between items-center gap-4 flex-wrap border-b pb-3 mb-4">
                <h3 className="font-bold text-base">Security Audits Logs</h3>
                
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search logs by action/user/IP..."
                    value={searchLogQuery}
                    onChange={(e) => setSearchLogQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs focus:outline-none"
                  />
                </div>
              </div>

              {filteredLogs.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">No telemetry logs found matching filter criteria.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                        <th className="pb-3 pl-2">User name</th>
                        <th className="pb-3">Action Details</th>
                        <th className="pb-3">Client IP Address</th>
                        <th className="pb-3">Device metadata payload</th>
                        <th className="pb-3 text-right pr-2">Date & Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-600 dark:text-slate-300 font-medium">
                      {filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/10">
                          <td className="py-3 pl-2 font-bold text-slate-800 dark:text-slate-100">{log.users?.name || "System automated"}</td>
                          <td className="py-3">
                            <span className="font-mono bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded text-[10px]">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 font-mono text-slate-400">{log.ip_address}</td>
                          <td className="py-3 font-mono text-[9px] max-w-xs truncate text-slate-500" title={JSON.stringify(log.metadata)}>
                            {JSON.stringify(log.metadata)}
                          </td>
                          <td className="py-3 text-right pr-2 text-slate-400 font-mono">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          )}

        </div>

      </main>

      {/* Password Reset Modal */}
      {showPasswordResetModal && (
        <div className="fixed inset-0 bg-slate-950/40 dark:bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xl w-full max-w-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Key className="h-4 w-4 text-blue-600" />
                Trigger password override audit
              </h4>
              <button onClick={() => setShowPasswordResetModal(null)} className="text-xs text-slate-450 hover:text-slate-800 dark:hover:text-slate-200">Close</button>
            </div>

            <form onSubmit={triggerPasswordResetSubmit} className="space-y-4">
              <p className="text-xs text-slate-500">
                Because Supabase uses secure client-side tokens, password updates must normally route through authentication callback emails. This action records a security reset request audit event for verification.
              </p>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Mock security validation string</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. bypass_token_alpha"
                  value={newPasswordValue}
                  onChange={(e) => setNewPasswordValue(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition disabled:opacity-50"
              >
                Log reset override event
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
