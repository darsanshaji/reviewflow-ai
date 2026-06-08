"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  Activity, ShieldAlert, Loader2, ArrowUpRight,
  LayoutDashboard, QrCode, MessageSquare, Users, Settings,
  AlertOctagon, Cpu, Database, HardDrive, Clock
} from "lucide-react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";

interface ErrorLogRecord {
  id: string;
  type: string;
  message: string;
  code: string;
  timestamp: string;
}

export default function MonitoringPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Context Context
  const [tenantName, setTenantName] = useState("My Business");
  const [roleName, setRoleName] = useState("Staff");
  const [userRole, setUserRole] = useState<number | null>(null);

  // Mock Error logs
  const [errorLogs, setErrorLogs] = useState<ErrorLogRecord[]>([
    { id: "err_01", type: "API Error", message: "Failed to exchange PKCE authorization code", code: "AUTH_500", timestamp: new Date(Date.now() - 3600000).toISOString() },
    { id: "err_02", type: "Database Error", message: "Row-Level Security violation on feedback insert", code: "PG_RLS_403", timestamp: new Date(Date.now() - 7200000).toISOString() },
    { id: "err_03", type: "Application Error", message: "Failed to load canvas element in browser context", code: "DOM_CANVAS_404", timestamp: new Date(Date.now() - 14400000).toISOString() }
  ]);

  // Performance telemetry states
  const [apiLatency, setApiLatency] = useState(42); // ms
  const [dbLoad, setDbLoad] = useState(18); // %
  const [storageUsage, setStorageUsage] = useState(1.2); // GB

  useEffect(() => {
    async function loadMonitoringContext() {
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

        setUserRole(profile.role_id);
        setTenantName(profile.tenants?.name || "My Business");
        setRoleName(profile.roles?.name || "Staff");

      } catch (err) {
        setErrorMsg("Failed to query telemetry logs.");
      } finally {
        setLoading(false);
      }
    }
    loadMonitoringContext();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-sm text-slate-500 font-medium">Booting Telemetry Monitor...</span>
        </div>
      </div>
    );
  }

  // RBAC blocking: only Corporate Owner (2) and Super Admin (1) can see monitoring console
  if (userRole && userRole !== 1 && userRole !== 2) {
    return (
      <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
        <Sidebar tenantName={tenantName} roleName={roleName} userRoleId={userRole} />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center shadow-md">
            <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Access Denied</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Platform Health & Telemetry metrics are restricted to Super Admins and Corporate Owners.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      
      {/* Sidebar */}
      <Sidebar tenantName={tenantName} roleName={roleName} userRoleId={userRole} />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Activity className="h-6 w-6 text-blue-600" />
              Platform Health & Telemetry
            </h1>
            <p className="text-slate-500 dark:text-slate-400">Track server latency, database active connection load, and storage metrics.</p>
          </div>
        </header>

        {/* METRICS GAUGES GRID */}
        <section className="grid gap-6 sm:grid-cols-3 mb-8">
          
          <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-blue-500" />
                API Response Time
              </h3>
              <p className="text-3xl font-extrabold mt-2 text-blue-600 dark:text-blue-400">{apiLatency} ms</p>
              <span className="text-[10px] text-slate-400 mt-1 block">Average route response latency</span>
            </div>
            <ArrowUpRight className="h-8 w-8 text-blue-50 dark:text-blue-950/20" />
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-indigo-500" />
                Database Load (CPU)
              </h3>
              <p className="text-3xl font-extrabold mt-2 text-indigo-600 dark:text-indigo-400">{dbLoad}%</p>
              <span className="text-[10px] text-slate-400 mt-1 block">Active connections pool CPU</span>
            </div>
            <ArrowUpRight className="h-8 w-8 text-indigo-50 dark:text-indigo-950/20" />
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <HardDrive className="h-3.5 w-3.5 text-green-500" />
                Supabase Storage Used
              </h3>
              <p className="text-3xl font-extrabold mt-2 text-green-600 dark:text-green-400">{storageUsage} GB</p>
              <span className="text-[10px] text-slate-400 mt-1 block">Of 5.0 GB free quota allocations</span>
            </div>
            <ArrowUpRight className="h-8 w-8 text-green-50 dark:text-green-950/20" />
          </div>

        </section>

        {/* ERROR LOGS FEED TABLE */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <h2 className="font-bold text-base mb-4 flex items-center gap-2">
            <AlertOctagon className="h-5 w-5 text-red-500" />
            Exceptions & Errors Monitor
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                  <th className="pb-3 pl-2">Error Type</th>
                  <th className="pb-3">Message Description</th>
                  <th className="pb-3">Error Code</th>
                  <th className="pb-3 text-right pr-2">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y text-slate-600 dark:text-slate-350">
                {errorLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/10">
                    <td className="py-3 pl-2 font-extrabold text-red-600">{log.type}</td>
                    <td className="py-3 font-medium text-slate-800 dark:text-slate-200">{log.message}</td>
                    <td className="py-3 font-mono font-bold text-[10px]">{log.code}</td>
                    <td className="py-3 text-right pr-2 text-slate-450 font-medium">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </div>
  );
}

// Sidebar links helper imports
import { Star } from "lucide-react";
