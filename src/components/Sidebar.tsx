"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  Star, LayoutDashboard, MessageSquare, QrCode, Users, 
  CreditCard, Settings, ClipboardList, Activity, LogOut,
  BarChart3, ShieldAlert
} from "lucide-react";

interface SidebarProps {
  tenantName: string;
  roleName: string;
  userRoleId?: number | null;
}

export default function Sidebar({ tenantName, roleName, userRoleId }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const navItems = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/dashboard/campaigns", label: "Campaigns", icon: MessageSquare },
    { href: "/dashboard/qrs", label: "QR Generator", icon: QrCode },
    { href: "/dashboard/staff", label: "Staff Performance", icon: Users },
    { href: "/dashboard/ai", label: "AI Insights", icon: ClipboardList },
    { href: "/dashboard/billing", label: "Billing & Limits", icon: CreditCard },
    { href: "/dashboard/settings", label: "Branding Settings", icon: Settings },
  ];

  // System level monitoring for Super Admin (1) or Owner (2)
  const showMonitoring = userRoleId === 1 || userRoleId === 2;

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between shrink-0 h-screen">
      <div className="flex-1 overflow-y-auto">
        <div className="h-16 px-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 font-bold text-lg text-blue-600 dark:text-blue-400">
          <Star className="h-5 w-5 fill-current" />
          <span>ReviewFlow AI</span>
        </div>

        <div className="p-4 space-y-1">
          <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href}
                href={item.href} 
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition ${
                  isActive 
                    ? "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold" 
                    : "text-slate-600 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}

          {showMonitoring && (
            <>
              <div className="px-3 py-1.5 pt-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Administration
              </div>
              <Link 
                href="/dashboard/monitoring" 
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition ${
                  pathname === "/dashboard/monitoring" 
                    ? "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold" 
                    : "text-slate-600 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <Activity className="h-4 w-4" />
                Platform Monitor
              </Link>
              <Link 
                href="/dashboard/settings/audit-logs" 
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition ${
                  pathname === "/dashboard/settings/audit-logs" 
                    ? "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold" 
                    : "text-slate-600 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <ClipboardList className="h-4 w-4" />
                Security Audit Logs
              </Link>
              {userRoleId === 1 && (
                <Link 
                  href="/dashboard/super-admin" 
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition ${
                    pathname === "/dashboard/super-admin" 
                      ? "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold" 
                      : "text-slate-600 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <ShieldAlert className="h-4 w-4 text-red-500" />
                  Super Admin Panel
                </Link>
              )}
            </>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Active Workspace</div>
        <div className="font-extrabold text-sm truncate text-slate-800 dark:text-slate-200">{tenantName}</div>
        <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/50 w-max px-2 py-0.5 rounded-full mt-1">
          {roleName}
        </div>
        
        <button 
          onClick={handleSignOut} 
          className="w-full flex items-center justify-center gap-2 py-2 mt-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-lg text-xs transition"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
