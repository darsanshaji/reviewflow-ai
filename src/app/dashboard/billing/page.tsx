"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  Award, ShieldCheck, Loader2, CheckCircle2, AlertCircle,
  Building, Users, Send, Settings, ArrowUpRight,
  LayoutDashboard, QrCode, MessageSquare, CreditCard, Star
} from "lucide-react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";

interface PlanLimits {
  branches: number;
  users: number;
  campaigns: number;
}

const planConfig: Record<string, { price: string; features: string[]; limits: PlanLimits }> = {
  "Starter": {
    price: "₹999/month",
    limits: { branches: 1, users: 5, campaigns: 100 },
    features: ["Single Branch Location", "Up to 5 Users", "100 Campaigns/mo", "Review Funnel Redirects", "QR Code Generation"]
  },
  "Growth": {
    price: "₹2,999/month",
    limits: { branches: 5, users: 20, campaigns: 1000 },
    features: ["Up to 5 Branches", "Up to 20 Users", "1,000 Campaigns/mo", "Staff Leaderboard Analytics", "AI sentiment breakdowns"]
  },
  "Enterprise": {
    price: "₹10,000+/month",
    limits: { branches: 9999, users: 9999, campaigns: 999999 },
    features: ["Unlimited Branches & franchises", "Unlimited Users", "Unlimited Campaigns", "Custom CNAME Domains", "Developer API Access", "Custom Integrations"]
  }
};

export default function BillingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Context Context
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState("My Business");
  const [roleName, setRoleName] = useState("Staff");
  const [userRole, setUserRole] = useState<number | null>(null);

  // Subscription Status
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState("Starter");
  const [subStatus, setSubStatus] = useState("Active");
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState("");
  const [limits, setLimits] = useState<PlanLimits>({ branches: 1, users: 5, campaigns: 100 });

  // Usage Counts
  const [branchCount, setBranchCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [campaignsSentCount, setCampaignsSentCount] = useState(0);

  useEffect(() => {
    async function loadBillingData() {
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

        setTenantId(profile.tenant_id);
        setUserRole(profile.role_id);
        setTenantName(profile.tenants?.name || "My Business");
        setRoleName(profile.roles?.name || "Staff");

        const activeTenantId = profile.tenant_id;

        // Fetch counts for usage bars
        const { count: bCount } = await supabase.from("branches").select("*", { count: "exact", head: true }).eq("tenant_id", activeTenantId);
        setBranchCount(bCount || 0);

        const { count: uCount } = await supabase.from("users").select("*", { count: "exact", head: true }).eq("tenant_id", activeTenantId);
        setUserCount(uCount || 0);

        const { count: cCount } = await supabase.from("campaigns").select("*", { count: "exact", head: true }).eq("tenant_id", activeTenantId).eq("status", "Sent");
        setCampaignsSentCount(cCount || 0);

        // Fetch subscription record
        const { data: subData } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("tenant_id", activeTenantId)
          .single();

        if (subData) {
          setSubscriptionId(subData.id);
          setCurrentPlan(subData.plan_name);
          setSubStatus(subData.status);
          setCurrentPeriodEnd(new Date(subData.current_period_end).toLocaleDateString());
          
          const parsedLimits = subData.limits as any;
          setLimits({
            branches: parsedLimits.branches || 1,
            users: parsedLimits.users || 5,
            campaigns: parsedLimits.campaigns_per_month || 100
          });
        } else {
          // If no subscription exists in database, seed a default Starter one
          const futureDate = new Date();
          futureDate.setDate(futureDate.getDate() + 30);
          
          const { data: newSub } = await supabase
            .from("subscriptions")
            .insert({
              tenant_id: activeTenantId,
              plan_name: "Starter",
              status: "Active",
              current_period_end: futureDate.toISOString(),
              limits: { branches: 1, users: 5, campaigns_per_month: 100 }
            })
            .select()
            .single();

          if (newSub) {
            setSubscriptionId(newSub.id);
            setCurrentPeriodEnd(new Date(newSub.current_period_end).toLocaleDateString());
          }
        }

      } catch (err) {
        setErrorMsg("Failed to query billing profiles.");
      } finally {
        setLoading(false);
      }
    }
    loadBillingData();
  }, [router, supabase]);

  const handleUpgradePlan = async (planName: string) => {
    if (!tenantId || !subscriptionId) return;

    setUpgrading(planName);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const selectedLimits = planConfig[planName].limits;
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const { error } = await supabase
        .from("subscriptions")
        .update({
          plan_name: planName,
          current_period_end: futureDate.toISOString(),
          limits: {
            branches: selectedLimits.branches,
            users: selectedLimits.users,
            campaigns_per_month: selectedLimits.campaigns
          }
        })
        .eq("id", subscriptionId);

      if (error) throw error;

      setCurrentPlan(planName);
      setLimits(selectedLimits);
      setCurrentPeriodEnd(futureDate.toLocaleDateString());
      setSuccessMsg(`Upgraded to the ${planName} plan successfully! Limits updated.`);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update subscription tier.");
    } finally {
      setUpgrading(null);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      
      <Sidebar tenantName={tenantName} roleName={roleName} userRoleId={userRole} />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Billing & Resource Limits</h1>
            <p className="text-slate-500 dark:text-slate-400">Monitor active subscription plan capabilities and resource limits.</p>
          </div>
        </header>

        {errorMsg && (
          <div className="mb-6 p-4 border border-red-200 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 border border-green-200 bg-green-50 text-green-600 text-sm rounded-lg flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          
          {/* CURRENT SUBSCRIPTION & RESOURCE LIMIT PROGRESS BARS */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Active Subscription status info */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Current Tier Plan</span>
                <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <Award className="h-6 w-6 text-blue-600 fill-current" />
                  {currentPlan} Plan
                </h2>
                <p className="text-xs text-slate-500 mt-1">Status: **{subStatus}** (Renews on {currentPeriodEnd})</p>
              </div>
              <span className="text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full font-bold">
                Active Billing
              </span>
            </div>

            {/* Resource Limit Gauges */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-5">
              <h3 className="font-bold text-base border-b pb-2">Resource Usage & Allocations</h3>

              {/* Branch limit */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <Building className="h-4 w-4" /> Branch Locations
                  </span>
                  <span className="font-semibold text-slate-500">
                    {branchCount} / {limits.branches > 1000 ? "Unlimited" : limits.branches}
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    style={{ width: `${Math.min((branchCount / limits.branches) * 100, 100)}%` }} 
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  ></div>
                </div>
              </div>

              {/* Users limit */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <Users className="h-4 w-4" /> Team Accounts
                  </span>
                  <span className="font-semibold text-slate-500">
                    {userCount} / {limits.users > 1000 ? "Unlimited" : limits.users}
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    style={{ width: `${Math.min((userCount / limits.users) * 100, 100)}%` }} 
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                  ></div>
                </div>
              </div>

              {/* Campaign limit */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <Send className="h-4 w-4" /> Campaign Solicitations / mo
                  </span>
                  <span className="font-semibold text-slate-500">
                    {campaignsSentCount} / {limits.campaigns > 10000 ? "Unlimited" : limits.campaigns}
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    style={{ width: `${Math.min((campaignsSentCount / limits.campaigns) * 100, 100)}%` }} 
                    className="h-full bg-green-600 rounded-full transition-all duration-500"
                  ></div>
                </div>
              </div>

            </div>

          </div>

          {/* PRICING TIER PLANS UPGRADE */}
          <div className="space-y-4">
            <h3 className="font-bold text-xs uppercase text-slate-400 tracking-wider">Plan Pricing Upgrade Tiers</h3>

            {Object.keys(planConfig).map((planName) => {
              const config = planConfig[planName];
              const isCurrent = currentPlan === planName;

              return (
                <div 
                  key={planName} 
                  className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm space-y-4 transition ${
                    isCurrent ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-extrabold text-sm">{planName}</h4>
                      <span className="text-xs text-slate-400 mt-1 block">{config.price}</span>
                    </div>
                    {isCurrent && (
                      <span className="text-[9px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                  </div>

                  <ul className="space-y-2 border-t pt-3 border-slate-100 dark:border-slate-800">
                    {config.features.map((feature, idx) => (
                      <li key={idx} className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {!isCurrent && (
                    <button
                      type="button"
                      disabled={upgrading !== null}
                      onClick={() => handleUpgradePlan(planName)}
                      className="w-full flex items-center justify-center gap-1 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold rounded-lg transition"
                    >
                      {upgrading === planName ? (
                        <Loader2 className="h-4.5 w-4.5 animate-spin" />
                      ) : (
                        <>
                          <span>Upgrade to {planName}</span>
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

        </div>

      </main>
    </div>
  );
}

// Side links imports
import { QrCode as QrIcon } from "lucide-react";
