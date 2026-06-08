"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  ShieldAlert, ShieldCheck, Loader2, AlertCircle, CheckCircle, 
  Building, Users, CreditCard, Activity, Clock, Trash2, ArrowLeft,
  ChevronRight, Sparkles, RefreshCw
} from "lucide-react";
import Sidebar from "@/components/Sidebar";

interface TenantRecord {
  id: string;
  name: string;
  created_at: string;
  subscriptions: {
    plan_name: string;
    status: string;
    current_period_end: string;
  } | null;
}

interface UserRecord {
  id: string;
  name: string;
  tenant_id: string | null;
  role_id: number;
  roles: { name: string } | null;
  tenants: { name: string } | null;
}

interface AuditRecord {
  id: string;
  action: string;
  ip_address: string;
  metadata: any;
  created_at: string;
  users: { name: string } | null;
  tenants: { name: string } | null;
}

export default function SuperAdminConsolePage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Super Admin profile context
  const [superAdminName, setSuperAdminName] = useState("");
  const [superAdminTenantName, setSuperAdminTenantName] = useState("");
  const [superAdminRoleId, setSuperAdminRoleId] = useState<number | null>(null);

  // Lists Data
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [logs, setLogs] = useState<AuditRecord[]>([]);
  
  // Dashboard Tabs
  const [activeTab, setActiveTab] = useState<"tenants" | "users" | "logs" | "errors">("tenants");

  // Load console parameters
  async function loadConsoleData() {
    try {
      setLoading(true);
      setErrorMsg("");

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      // Check User Profile Role
      const { data: profile } = (await supabase
        .from("users")
        .select("name, tenant_id, role_id, roles(name), tenants(name)")
        .eq("id", session.user.id)
        .single()) as any;

      if (!profile || profile.role_id !== 1) {
        // Not a Super Admin
        router.push("/dashboard");
        return;
      }

      setSuperAdminName(profile.name);
      setSuperAdminTenantName(profile.tenants?.name || "Global Admin");
      setSuperAdminRoleId(profile.role_id);

      // 1. Run Automated Weekly Log Purge (Delete entries older than 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      await supabase
        .from("audit_logs")
        .delete()
        .lt("created_at", sevenDaysAgo.toISOString());

      // 2. Fetch Tenants & Subscriptions
      const { data: tenantsData } = await supabase
        .from("tenants")
        .select(`
          id,
          name,
          created_at,
          subscriptions (
            plan_name,
            status,
            current_period_end
          )
        `)
        .order("created_at", { ascending: false });

      if (tenantsData) {
        // Standardizing nested object arrays
        const formattedTenants = tenantsData.map((t: any) => ({
          id: t.id,
          name: t.name,
          created_at: t.created_at,
          subscriptions: Array.isArray(t.subscriptions) ? t.subscriptions[0] || null : t.subscriptions
        }));
        setTenants(formattedTenants);
      }

      // 3. Fetch Users
      const { data: usersData } = await supabase
        .from("users")
        .select(`
          id,
          name,
          tenant_id,
          role_id,
          roles ( name ),
          tenants ( name )
        `)
        .order("name", { ascending: true });

      if (usersData) {
        setUsers(usersData as any);
      }

      // 4. Fetch All Global Audit Logs
      const { data: logsData } = await supabase
        .from("audit_logs")
        .select(`
          id,
          action,
          ip_address,
          metadata,
          created_at,
          users ( name ),
          tenants ( name )
        `)
        .order("created_at", { ascending: false });

      if (logsData) {
        setLogs(logsData as any);
      }

    } catch (err: any) {
      setErrorMsg(err.message || "Failed to retrieve Super Admin database records.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConsoleData();
  }, [router, supabase]);

  // Purge logs manually trigger
  const handleManualPurge = async () => {
    setActionLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { error } = await supabase
        .from("audit_logs")
        .delete()
        .lt("created_at", sevenDaysAgo.toISOString());

      if (error) throw error;
      
      setSuccessMsg("Audit logs older than 7 days have been successfully purged!");
      // Reload logs feed
      const { data: logsData } = await supabase
        .from("audit_logs")
        .select(`
          id,
          action,
          ip_address,
          metadata,
          created_at,
          users ( name ),
          tenants ( name )
        `)
        .order("created_at", { ascending: false });
      if (logsData) setLogs(logsData as any);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to purge audit database logs.");
    } finally {
      setActionLoading(false);
    }
  };

  // Modify User Role
  const handleModifyUserRole = async (userId: string, newRoleId: number) => {
    setActionLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const { error } = await supabase
        .from("users")
        .update({ role_id: newRoleId })
        .eq("id", userId);

      if (error) throw error;
      setSuccessMsg("User role updated successfully.");
      
      // Refresh list
      setUsers(users.map(u => u.id === userId ? { ...u, role_id: newRoleId } : u));
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update user role permissions.");
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Tenant Suspension (Active / Suspended status)
  const handleToggleSuspension = async (tenantId: string, currentStatus: string) => {
    setActionLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    const nextStatus = currentStatus === "Active" ? "Suspended" : "Active";
    try {
      // Check if subscription record exists
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("tenant_id", tenantId)
        .single();

      let error = null;
      if (sub) {
        const { error: err } = await supabase
          .from("subscriptions")
          .update({ status: nextStatus })
          .eq("tenant_id", tenantId);
        error = err;
      } else {
        const { error: err } = await supabase
          .from("subscriptions")
          .insert({
            tenant_id: tenantId,
            plan_name: "Starter",
            status: nextStatus,
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          });
        error = err;
      }

      if (error) throw error;
      setSuccessMsg(`Organization status updated to ${nextStatus}.`);
      
      // Update state
      setTenants(tenants.map(t => {
        if (t.id === tenantId) {
          return {
            ...t,
            subscriptions: t.subscriptions ? { ...t.subscriptions, status: nextStatus } : { plan_name: "Starter", status: nextStatus, current_period_end: "" }
          };
        }
        return t;
      }));
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to modify tenant status.");
    } finally {
      setActionLoading(false);
    }
  };

  // Change Subscription Plan
  const handleChangePlan = async (tenantId: string, newPlan: string) => {
    setActionLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("tenant_id", tenantId)
        .single();

      let error = null;
      if (sub) {
        const { error: err } = await supabase
          .from("subscriptions")
          .update({ plan_name: newPlan })
          .eq("tenant_id", tenantId);
        error = err;
      } else {
        const { error: err } = await supabase
          .from("subscriptions")
          .insert({
            tenant_id: tenantId,
            plan_name: newPlan,
            status: "Active",
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          });
        error = err;
      }

      if (error) throw error;
      setSuccessMsg(`Subscription plan successfully changed to ${newPlan}.`);
      
      // Update state
      setTenants(tenants.map(t => {
        if (t.id === tenantId) {
          return {
            ...t,
            subscriptions: t.subscriptions ? { ...t.subscriptions, plan_name: newPlan } : { plan_name: newPlan, status: "Active", current_period_end: "" }
          };
        }
        return t;
      }));
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update tenant subscription level.");
    } finally {
      setActionLoading(false);
    }
  };

  // Statistics counters
  const totalTenants = tenants.length;
  const totalUsers = users.length;
  const activeTenants = tenants.filter(t => t.subscriptions?.status !== "Suspended").length;
  const suspendedTenants = totalTenants - activeTenants;

  // Filter logs vs errors
  const activityLogs = logs.filter(l => l.action !== "system_error");
  const errorLogs = logs.filter(l => l.action === "system_error");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-red-600" />
          <span className="text-sm text-slate-500 font-semibold">Loading Super-Admin workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      
      <Sidebar tenantName={superAdminTenantName} roleName="Super Admin" userRoleId={superAdminRoleId} />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <ShieldAlert className="h-6 w-6 text-red-500 animate-pulse" />
              SaaS Super-Admin Console
            </h1>
            <p className="text-slate-500 dark:text-slate-400">Global tenant management, subscription billing parameters, activity logs, and exceptions tracker.</p>
          </div>

          <button
            onClick={handleManualPurge}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-950/40 dark:text-red-400 font-bold rounded-lg text-xs transition border border-red-200 dark:border-red-900/50 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Purge Logs &gt; 7 Days</span>
          </button>
        </header>

        {errorMsg && (
          <div className="mb-6 p-4 border border-red-200 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 border border-green-200 bg-green-50 text-green-600 text-sm rounded-lg flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Global Statistics Panel */}
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-blue-600 dark:text-blue-400">
              <Building className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Tenants</span>
              <p className="text-2xl font-extrabold mt-0.5 text-slate-800 dark:text-slate-200">{totalTenants}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex items-center gap-4">
            <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg text-green-600 dark:text-green-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Active Workspaces</span>
              <p className="text-2xl font-extrabold mt-0.5 text-slate-800 dark:text-slate-200">{activeTenants}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex items-center gap-4">
            <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg text-red-600 dark:text-red-400">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Suspended Workspaces</span>
              <p className="text-2xl font-extrabold mt-0.5 text-slate-800 dark:text-slate-200">{suspendedTenants}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex items-center gap-4">
            <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg text-purple-600 dark:text-purple-400">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Onboarded Users</span>
              <p className="text-2xl font-extrabold mt-0.5 text-slate-800 dark:text-slate-200">{totalUsers}</p>
            </div>
          </div>
        </section>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 font-semibold text-sm">
          <button
            onClick={() => setActiveTab("tenants")}
            className={`pb-3 px-4 transition ${activeTab === "tenants" ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            Tenant Subscriptions ({totalTenants})
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`pb-3 px-4 transition ${activeTab === "users" ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            User Permissions ({totalUsers})
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`pb-3 px-4 transition ${activeTab === "logs" ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            Access & Activity Logs ({activityLogs.length})
          </button>
          <button
            onClick={() => setActiveTab("errors")}
            className={`pb-3 px-4 transition ${activeTab === "errors" ? 'border-b-2 border-red-500 text-red-500' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            Exceptions & Errors ({errorLogs.length})
          </button>
        </div>

        {/* TABLE GRIDS */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          
          {/* TAB 1: TENANT SUBSCRIPTIONS */}
          {activeTab === "tenants" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                    <th className="pb-3 pl-2">Organization ID / Name</th>
                    <th className="pb-3">Registered Date</th>
                    <th className="pb-3">Subscription Tier</th>
                    <th className="pb-3">Billing Status</th>
                    <th className="pb-3 text-right pr-2">Management Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-slate-600 dark:text-slate-300 font-medium">
                  {tenants.map((tenant) => {
                    const status = tenant.subscriptions?.status || "Active";
                    const isSuspended = status === "Suspended";
                    return (
                      <tr key={tenant.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/10">
                        <td className="py-3 pl-2 max-w-xs">
                          <span className="font-extrabold text-slate-800 dark:text-slate-100 block">{tenant.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono block truncate">{tenant.id}</span>
                        </td>
                        <td className="py-3 text-slate-400">{new Date(tenant.created_at).toLocaleDateString()}</td>
                        <td className="py-3">
                          <select
                            value={tenant.subscriptions?.plan_name || "Starter"}
                            onChange={(e) => handleChangePlan(tenant.id, e.target.value)}
                            disabled={actionLoading}
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 focus:outline-none font-bold text-xs"
                          >
                            <option value="Starter">Starter</option>
                            <option value="Growth">Growth</option>
                            <option value="Enterprise">Enterprise</option>
                          </select>
                        </td>
                        <td className="py-3">
                          <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            isSuspended ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
                          }`}>
                            {status}
                          </span>
                        </td>
                        <td className="py-3 text-right pr-2">
                          <button
                            onClick={() => handleToggleSuspension(tenant.id, status)}
                            disabled={actionLoading}
                            className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border transition ${
                              isSuspended 
                                ? 'bg-green-50 hover:bg-green-100 text-green-600 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/50' 
                                : 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50'
                            }`}
                          >
                            {isSuspended ? "Reactivate Workspace" : "Suspend Workspace"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: USER PERMISSIONS */}
          {activeTab === "users" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                    <th className="pb-3 pl-2">User Name</th>
                    <th className="pb-3">Organization Context</th>
                    <th className="pb-3">Current Authorization Role</th>
                    <th className="pb-3 text-right pr-2">Modify Security Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-slate-600 dark:text-slate-300 font-medium">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/10">
                      <td className="py-3 pl-2">
                        <span className="font-extrabold text-slate-800 dark:text-slate-100 block">{user.name}</span>
                        <span className="text-[9px] font-mono text-slate-400 block">{user.id}</span>
                      </td>
                      <td className="py-3 text-slate-500">
                        {user.tenants?.name || (
                          <span className="text-red-500 font-bold italic">Global Operations</span>
                        )}
                      </td>
                      <td className="py-3">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          user.role_id === 1 ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' :
                          user.role_id === 2 ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400' :
                          'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {user.roles?.name || "Staff"}
                        </span>
                      </td>
                      <td className="py-3 text-right pr-2">
                        <select
                          value={user.role_id}
                          onChange={(e) => handleModifyUserRole(user.id, parseInt(e.target.value, 10))}
                          disabled={actionLoading}
                          className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1.5 focus:outline-none text-xs font-bold"
                        >
                          <option value="1">Super Admin</option>
                          <option value="2">Owner</option>
                          <option value="3">Manager</option>
                          <option value="4">Receptionist</option>
                          <option value="5">Staff</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: ACCESS & ACTIVITY LOGS */}
          {activeTab === "logs" && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border rounded-lg text-xs text-slate-500 flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span>Access telemetry tracks dashboard access requests. Inactive user activities and security audit logs are completely refreshed and purged every 7 days.</span>
              </div>
              
              {activityLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 border border-dashed rounded-lg bg-slate-50 dark:bg-slate-950">
                  <Activity className="h-8 w-8 text-slate-300 mb-2" />
                  <p className="text-xs text-slate-400">No dashboard access telemetry records generated this week.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                        <th className="pb-3 pl-2">User Name</th>
                        <th className="pb-3">Organization Context</th>
                        <th className="pb-3">Action Details</th>
                        <th className="pb-3">IP Address</th>
                        <th className="pb-3">Device metadata</th>
                        <th className="pb-3 text-right pr-2">Event Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-600 dark:text-slate-300 font-medium">
                      {activityLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/10">
                          <td className="py-3 pl-2 font-bold text-slate-800 dark:text-slate-100">{log.users?.name || "System Automated"}</td>
                          <td className="py-3 text-slate-450">{log.tenants?.name || "Global Workspace"}</td>
                          <td className="py-3">
                            <span className="font-mono bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded text-[10px]">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 font-mono text-slate-400">{log.ip_address}</td>
                          <td className="py-3 font-mono text-[9px] max-w-xs truncate text-slate-500" title={JSON.stringify(log.metadata)}>
                            {JSON.stringify(log.metadata)}
                          </td>
                          <td className="py-3 text-right pr-2 text-slate-400 font-mono">
                            {new Date(log.created_at).toLocaleTimeString()} {new Date(log.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: EXCEPTIONS & ERROR MONITOR */}
          {activeTab === "errors" && (
            <div className="space-y-4">
              <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-lg text-xs text-red-700 dark:text-red-400 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-red-500" />
                <span>Exceptions monitor captures and alerts database failures, API connection drops, and RLS permission violations across all companies.</span>
              </div>
              
              {errorLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 border border-dashed rounded-lg bg-slate-50 dark:bg-slate-950">
                  <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                  <p className="text-xs text-slate-400">All systems operational. Zero execution exceptions reported this week.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                        <th className="pb-3 pl-2">Orginisation Context</th>
                        <th className="pb-3">Impacted User</th>
                        <th className="pb-3">Exception Details</th>
                        <th className="pb-3">Module Path</th>
                        <th className="pb-3 text-right pr-2">Date & Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-600 dark:text-slate-300 font-medium">
                      {errorLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-red-50/10 dark:hover:bg-red-950/5">
                          <td className="py-3 pl-2 font-extrabold text-slate-800 dark:text-slate-100">
                            {log.tenants?.name || (
                              <span className="text-red-500 italic">Global System</span>
                            )}
                          </td>
                          <td className="py-3 text-slate-450">{log.users?.name || "Anonymous Guest"}</td>
                          <td className="py-3 font-semibold text-red-600 dark:text-red-400 max-w-sm whitespace-pre-wrap">
                            {log.metadata?.message || "Execution exception recorded."}
                          </td>
                          <td className="py-3 font-mono text-[10px] text-slate-500">
                            {log.metadata?.path || "DashboardOverview"}
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

        </section>

      </main>
    </div>
  );
}
