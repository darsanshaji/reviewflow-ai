"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  MessageSquare, Plus, Mail, MessageCircle, QrCode, Phone,
  Send, Calendar, Clock, RotateCw, Trash2, Loader2,
  LayoutDashboard, Users, AlertCircle, Sparkles, CheckCircle,
  Star
} from "lucide-react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";

interface CampaignRecord {
  id: string;
  name: string;
  type: string;
  status: string;
  schedule_time: string | null;
  template_body: string;
  created_at: string;
  business_id: string;
  businesses: { name: string };
}

export default function CampaignsManagerPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [businesses, setBusinesses] = useState<{ id: string; name: string }[]>([]);
  
  // Tenant Context
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState("");
  const [roleName, setRoleName] = useState("Staff");
  const [userRoleId, setUserRoleId] = useState<number | null>(null);

  // Form State
  const [campaignName, setCampaignName] = useState("");
  const [selectedBusiness, setSelectedBusiness] = useState("");
  const [campaignType, setCampaignType] = useState("WhatsApp"); // WhatsApp, SMS, Email, QR
  const [scheduleType, setScheduleType] = useState("Immediate"); // Immediate, Scheduled, Recurring
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [recurrenceOption, setRecurrenceOption] = useState("Weekly"); // Weekly, Monthly
  const [templateBody, setTemplateBody] = useState(
    "Hi {{customer_name}},\n\nThank you for visiting {{business_name}}! We would love to hear your feedback. Please take 30 seconds to rate your experience: {{review_url}}\n\nBest regards,\nTeam {{business_name}}"
  );

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
            business_id,
            businesses ( name )
          `)
          .eq("tenant_id", activeTenantId)
          .order("created_at", { ascending: false });

        if (campaignsData) setCampaigns(campaignsData as any);

      } catch (err) {
        setErrorMsg("Failed to query campaign logs.");
      } finally {
        setLoading(false);
      }
    }
    loadCampaignsData();
  }, [router, supabase]);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !selectedBusiness || !campaignName) return;

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      // Calculate schedule ISO timestamp
      let targetTime: string | null = null;
      let initialStatus = "Draft";

      if (scheduleType === "Immediate") {
        targetTime = new Date().toISOString();
        initialStatus = "Sent"; // Instantly mock dispatching
      } else if (scheduleType === "Scheduled") {
        if (!scheduleDate || !scheduleTime) throw new Error("Please select schedule date and time.");
        targetTime = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
        initialStatus = "Scheduled";
      } else if (scheduleType === "Recurring") {
        targetTime = new Date().toISOString();
        initialStatus = "Scheduled"; // Recurring campaigns are marked active/scheduled
      }

      const { data: newCampaign, error } = await supabase
        .from("campaigns")
        .insert({
          tenant_id: tenantId,
          business_id: selectedBusiness,
          name: campaignName,
          type: campaignType,
          schedule_time: targetTime,
          status: initialStatus,
          template_body: templateBody
        })
        .select(`
          id,
          name,
          type,
          status,
          schedule_time,
          template_body,
          created_at,
          business_id,
          businesses ( name )
        `)
        .single();

      if (error) throw error;

      setCampaigns([newCampaign as any, ...campaigns]);
      setSuccessMsg(`Campaign "${campaignName}" created successfully!`);
      
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
      const { error } = await supabase
        .from("campaigns")
        .update({ status: "Sent", schedule_time: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      setCampaigns(
        campaigns.map((c) => (c.id === id ? { ...c, status: "Sent", schedule_time: new Date().toISOString() } : c))
      );
      setSuccessMsg("Campaign sent successfully!");
    } catch (err) {
      alert("Failed to send campaign.");
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm("Are you sure you want to delete this campaign?")) return;

    try {
      const { error } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", id);
      if (error) throw error;

      setCampaigns(campaigns.filter((c) => c.id !== id));
    } catch (err) {
      alert("Failed to delete campaign.");
    }
  };

  const getCampaignIcon = (type: string) => {
    switch (type) {
      case "WhatsApp": return <MessageCircle className="h-4 w-4 text-green-500" />;
      case "SMS": return <Phone className="h-4 w-4 text-blue-500" />;
      case "Email": return <Mail className="h-4 w-4 text-indigo-500" />;
      case "QR": return <QrCode className="h-4 w-4 text-teal-500" />;
      default: return <MessageSquare className="h-4 w-4 text-slate-500" />;
    }
  };

  // Dynamic template preview generator
  const getTemplatePreview = () => {
    const biz = businesses.find((b) => b.id === selectedBusiness);
    const bizName = biz ? biz.name : "Bella Salon & Spa";
    return templateBody
      .replace(/{{business_name}}/g, bizName)
      .replace(/{{customer_name}}/g, "Jane Doe")
      .replace(/{{review_url}}/g, `${window.location.origin}/review/t/abc123`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-sm text-slate-500 font-medium">Loading Campaign Engine...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      
      {/* Sidebar */}
      <Sidebar tenantName={tenantName} roleName={roleName} userRoleId={userRoleId} />

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto p-8">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Automated Campaign Engine</h1>
            <p className="text-slate-500 dark:text-slate-400">Send WhatsApp, Email, or SMS review requests to customer segments.</p>
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
            <CheckCircle className="h-4 w-4" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          
          {/* CAMPAIGN CREATION SETUP */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm h-max">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5 text-blue-600" />
              New Campaign
            </h2>

            <form onSubmit={handleCreateCampaign} className="space-y-4">
              
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Campaign Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. June Review Push"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Business Node</label>
                <select
                  required
                  value={selectedBusiness}
                  onChange={(e) => setSelectedBusiness(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
                >
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Delivery Channel</label>
                <select
                  value={campaignType}
                  onChange={(e) => setCampaignType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
                >
                  <option value="WhatsApp">WhatsApp Business API</option>
                  <option value="Email">Email Solicitations</option>
                  <option value="SMS">SMS Gateway Requests</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Scheduling Pattern</label>
                <select
                  value={scheduleType}
                  onChange={(e) => setScheduleType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
                >
                  <option value="Immediate">Send Immediately</option>
                  <option value="Scheduled">Scheduled Specific Time</option>
                  <option value="Recurring">Recurring Recurrence</option>
                </select>
              </div>

              {/* Dynamic Scheduler inputs */}
              {scheduleType === "Scheduled" && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Date</label>
                    <input
                      type="date"
                      required
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full px-3 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Time</label>
                    <input
                      type="time"
                      required
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full px-3 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {scheduleType === "Recurring" && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Recurrence Interval</label>
                  <select
                    value={recurrenceOption}
                    onChange={(e) => setRecurrenceOption(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
                  >
                    <option value="Daily">Daily Solicitation</option>
                    <option value="Weekly">Weekly Digest Push</option>
                    <option value="Monthly">Monthly Recurring campaigns</option>
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Message Template</label>
                <textarea
                  rows={4}
                  required
                  value={templateBody}
                  onChange={(e) => setTemplateBody(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs focus:outline-none resize-none"
                />
                <p className="text-[9px] text-slate-400 italic">
                  Use variables: {"{{customer_name}}"}, {"{{business_name}}"}, {"{{review_url}}"}
                </p>
              </div>

              {/* Dynamic Live Preview inside setup */}
              <div className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-950 space-y-1">
                <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Live Message Preview
                </span>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-mono whitespace-pre-wrap">
                  {getTemplatePreview()}
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting || businesses.length === 0}
                className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Create & Launch Campaign</span>
                  </>
                )}
              </button>

            </form>
          </div>

          {/* ACTIVE CAMPAIGN RECORDS LIST */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
            <h2 className="font-bold text-lg mb-4">Campaign Activity Logs</h2>

            {campaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 border border-dashed rounded-lg bg-slate-50 dark:bg-slate-950">
                <MessageSquare className="h-10 w-10 text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">No campaigns launched yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {campaigns.map((camp) => (
                  <div key={camp.id} className="p-4 border rounded-xl bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {getCampaignIcon(camp.type)}
                        <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">{camp.name}</h3>
                        <span className="text-[10px] text-slate-400">({camp.businesses.name})</span>
                      </div>
                      <p className="text-[11px] text-slate-500 max-w-md line-clamp-1 italic mt-1">&quot;{camp.template_body}&quot;</p>
                      
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                        <span className="flex items-center gap-0.5"><Calendar className="h-3 w-3" />Created: {new Date(camp.created_at).toLocaleDateString()}</span>
                        {camp.schedule_time && (
                          <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />Run: {new Date(camp.schedule_time).toLocaleString()}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        camp.status === 'Sent' ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400' :
                        camp.status === 'Scheduled' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400' :
                        'bg-slate-100 text-slate-500 dark:bg-slate-800'
                      }`}>
                        {camp.status}
                      </span>

                      {camp.status !== 'Sent' && (
                        <button
                          onClick={() => handleSendNow(camp.id)}
                          className="flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold rounded transition"
                        >
                          <Send className="h-3 w-3" />
                          Send Now
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteCampaign(camp.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 p-1.5 rounded transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </main>
    </div>
  );
}
