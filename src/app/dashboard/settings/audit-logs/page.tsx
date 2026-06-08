"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  ClipboardList, Loader2, ArrowLeft, ShieldCheck, 
  Settings, Clock, User, Info, AlertCircle
} from "lucide-react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";

interface AuditLogRecord {
  id: string;
  action: string;
  ip_address: string;
  metadata: any;
  created_at: string;
  users: { name: string } | null;
}

export default function AuditLogsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);

  // Tenant Context
  const [tenantName, setTenantName] = useState("My Business");
  const [roleName, setRoleName] = useState("Staff");
  const [userRoleId, setUserRoleId] = useState<number | null>(null);

  useEffect(() => {
    async function loadAuditLogs() {
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
          setErrorMsg("Tenant context missing.");
          setLoading(false);
          return;
        }

        setTenantName(profile.tenants?.name || "My Business");
        setRoleName(profile.roles?.name || "Staff");
        setUserRoleId(profile.role_id);

        // Fetch Audit Logs
        const { data: auditLogs, error: logsErr } = await supabase
          .from("audit_logs")
          .select(`
            id,
            action,
            ip_address,
            metadata,
            created_at,
            users ( name )
          `)
          .eq("tenant_id", profile.tenant_id)
          .order("created_at", { ascending: false });

        if (logsErr) throw logsErr;
        if (auditLogs) setLogs(auditLogs as any);

      } catch (err) {
        setErrorMsg("Failed to query security logs.");
      } finally {
        setLoading(false);
      }
    }
    loadAuditLogs();
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
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-green-600" />
              Corporate Security Audit Logs
            </h1>
            <p className="text-slate-500 dark:text-slate-400">Review all administrative modifications and access logs for the tenant.</p>
          </div>
        </header>

        {errorMsg && (
          <div className="mb-6 p-4 border border-red-200 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* AUDIT LOG TABLE LIST */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <h2 className="font-bold text-base mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-slate-400" />
            Active Audit History
          </h2>

          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border border-dashed rounded-lg bg-slate-50 dark:bg-slate-950">
              <ClipboardList className="h-8 w-8 text-slate-350 mb-2" />
              <p className="text-xs text-slate-400">No security audit logs found for this tenant workspace.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                    <th className="pb-3 pl-2">User</th>
                    <th className="pb-3">Action Details</th>
                    <th className="pb-3">IP Address</th>
                    <th className="pb-3">Parameters (JSON)</th>
                    <th className="pb-3 text-right pr-2">Date & Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-slate-600 dark:text-slate-300">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/10">
                      <td className="py-3 pl-2 font-extrabold flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-slate-450" />
                        {log.users?.name || "System Automated"}
                      </td>
                      <td className="py-3 font-semibold text-slate-800 dark:text-slate-100">{log.action}</td>
                      <td className="py-3 font-mono">{log.ip_address}</td>
                      <td className="py-3 font-mono max-w-xs truncate text-[10px]" title={JSON.stringify(log.metadata)}>
                        {JSON.stringify(log.metadata)}
                      </td>
                      <td className="py-3 text-right pr-2 font-medium text-slate-400">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </main>
    </div>
  );
}

// Helper icons loader imports
import { Star, LayoutDashboard } from "lucide-react";
