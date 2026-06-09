"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  QrCode, Plus, Download, Printer, Loader2, Star, 
  Trash2, Building, Users, Tag, Calendar, LayoutDashboard,
  ArrowLeft, Search, Eye, AlertCircle
} from "lucide-react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";

interface QRCodeRecord {
  id: string;
  target_type: string;
  target_id: string;
  dynamic_url: string;
  created_at: string;
  branch_id: string;
  staff_id: string | null;
  service_id: string | null;
  branches: { name: string };
  staff: { name: string } | null;
  services: { name: string } | null;
}

export default function QRManagerPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  // Data lists from DB
  const [qrList, setQrList] = useState<QRCodeRecord[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
  const [services, setServices] = useState<{ id: string; name: string }[]>([]);

  // Form State
  const [selectedBranch, setSelectedBranch] = useState("");
  const [targetType, setTargetType] = useState("Reception"); // Reception, Staff, Service, Table, Chair, Campaign
  const [selectedStaff, setSelectedStaff] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [customTargetId, setCustomTargetId] = useState(""); // E.g., "Table 5" or "Chair 3"

  // Analytics helper state
  const [analyticsData, setAnalyticsData] = useState<Record<string, { scans: number; conversions: number; avgRating: number }>>({});

  // Context Context
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState("My Business");
  const [roleName, setRoleName] = useState("Staff");
  const [userRole, setUserRole] = useState<number | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/login");
          return;
        }

        // Retrieve user profile to find tenant context
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
          setErrorMsg("Account tenant profile not found.");
          setLoading(false);
          return;
        }

        setTenantId(tenantIdVal);
        setTenantName(tenantNameVal);
        setRoleName(roleNameVal);
        setUserRole(userRoleIdVal);

        const tenantId = tenantIdVal;

        // Fetch Branches
        const { data: branchData } = await supabase
          .from("branches")
          .select("id, name")
          .eq("tenant_id", tenantId);
        if (branchData) {
          setBranches(branchData);
          if (branchData.length > 0) setSelectedBranch(branchData[0].id);
        }

        // Fetch Staff
        const { data: staffData } = await supabase
          .from("staff")
          .select("id, name")
          .eq("tenant_id", tenantId);
        if (staffData) setStaff(staffData);

        // Fetch Services
        const { data: serviceData } = await supabase
          .from("services")
          .select("id, name")
          .eq("tenant_id", tenantId);
        if (serviceData) setServices(serviceData);

        // Fetch QR Codes with relations
        const { data: qrs } = await supabase
          .from("qr_codes")
          .select(`
            id,
            target_type,
            target_id,
            dynamic_url,
            created_at,
            branch_id,
            staff_id,
            service_id,
            branches ( name ),
            staff ( name ),
            services ( name )
          `)
          .eq("tenant_id", tenantId);
        if (qrs) setQrList(qrs as any);

        // Fetch all analytics events to compute scans
        const { data: events } = await supabase
          .from("analytics_events")
          .select("event_type, metadata")
          .eq("tenant_id", tenantId);

        // Fetch feedback to calculate conversions and ratings
        const { data: feedbackData } = await supabase
          .from("feedback")
          .select("rating, branch_id, staff_id, service_id");

        // Compute metrics grouped by QR config ID
        const metrics: Record<string, { scans: number; conversions: number; avgRating: number; totalStars: number }> = {};
        
        qrs?.forEach((qr) => {
          metrics[qr.id] = { scans: 0, conversions: 0, avgRating: 0, totalStars: 0 };
        });

        events?.forEach((evt) => {
          const qrId = evt.metadata?.qr_code_id;
          if (qrId && metrics[qrId]) {
            if (evt.event_type === "qr_scan") {
              metrics[qrId].scans += 1;
            }
          }
        });

        // Loop feedbacks and associate to matching QR configuration criteria
        feedbackData?.forEach((fb) => {
          qrs?.forEach((qr) => {
            let matches = false;
            if (qr.target_type === "Reception" && fb.branch_id === qr.branch_id && !fb.staff_id) {
              matches = true;
            } else if (qr.target_type === "Staff" && fb.staff_id === qr.staff_id) {
              matches = true;
            } else if (qr.target_type === "Service" && fb.service_id === qr.service_id) {
              matches = true;
            }

            if (matches) {
              metrics[qr.id].conversions += 1;
              metrics[qr.id].totalStars += fb.rating;
            }
          });
        });

        const finalizedMetrics: Record<string, { scans: number; conversions: number; avgRating: number }> = {};
        Object.keys(metrics).forEach((qrId) => {
          const m = metrics[qrId];
          finalizedMetrics[qrId] = {
            scans: m.scans,
            conversions: m.conversions,
            avgRating: m.conversions > 0 ? parseFloat((m.totalStars / m.conversions).toFixed(1)) : 0
          };
        });

        setAnalyticsData(finalizedMetrics);
      } catch (err) {
        setErrorMsg("Failed to query data records.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router, supabase]);

  const handleGenerateQR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return;

    setSubmitting(true);
    setErrorMsg("");

    try {
      let activeTenantId = tenantId;
      if (typeof window !== "undefined") {
        const impId = sessionStorage.getItem("impersonate_tenant_id");
        if (impId) {
          activeTenantId = impId;
        }
      }
      if (!activeTenantId) throw new Error("No active tenant context.");

      // Establish target identifiers
      let targetIdVal = "General Reception";
      let staffIdVal: string | null = null;
      let serviceIdVal: string | null = null;

      if (targetType === "Staff") {
        const selected = staff.find((s) => s.id === selectedStaff);
        targetIdVal = selected ? selected.name : "Unknown Staff";
        staffIdVal = selectedStaff;
      } else if (targetType === "Service") {
        const selected = services.find((s) => s.id === selectedService);
        targetIdVal = selected ? selected.name : "Unknown Service";
        serviceIdVal = selectedService;
      } else if (targetType === "Table" || targetType === "Chair") {
        targetIdVal = customTargetId || `${targetType} 1`;
      }

      // Generate a temporary UUID for the QR configuration first
      const tempId = crypto.randomUUID();
      const mockDynamicUrl = `${window.location.origin}/review/t/${tempId}`;

      const { data: newQR, error } = await supabase
        .from("qr_codes")
        .insert({
          id: tempId,
          tenant_id: activeTenantId,
          branch_id: selectedBranch,
          staff_id: staffIdVal,
          service_id: serviceIdVal,
          target_type: targetType,
          target_id: targetIdVal,
          dynamic_url: mockDynamicUrl
        })
        .select(`
          id,
          target_type,
          target_id,
          dynamic_url,
          created_at,
          branch_id,
          staff_id,
          service_id,
          branches ( name ),
          staff ( name ),
          services ( name )
        `)
        .single();

      if (error) throw error;

      setQrList([newQR as any, ...qrList]);
      setAnalyticsData({
        ...analyticsData,
        [newQR.id]: { scans: 0, conversions: 0, avgRating: 0 }
      });

      // Clear forms
      setCustomTargetId("");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create QR code configuration.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteQR = async (id: string) => {
    if (!confirm("Are you sure you want to delete this QR configuration?")) return;

    try {
      const { error } = await supabase
        .from("qr_codes")
        .delete()
        .eq("id", id);
      if (error) throw error;

      setQrList(qrList.filter((q) => q.id !== id));
    } catch (err) {
      alert("Failed to delete the selected QR code.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-sm text-slate-500 font-medium">Loading QR Manager...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      
      <Sidebar tenantName={tenantName} roleName={roleName} userRoleId={userRole} />

      {/* Main content body */}
      <main className="flex-1 overflow-y-auto p-8">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">QR Code Management System</h1>
            <p className="text-slate-500 dark:text-slate-400">Deploy location and staff codes to generate reviews offline.</p>
          </div>
        </header>

        {errorMsg && (
          <div className="mb-6 p-4 border border-red-200 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          
          {/* GENERATE NEW QR FORM */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm h-max">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5 text-blue-600" />
              Generate QR Link
            </h2>

            <form onSubmit={handleGenerateQR} className="space-y-4">
              
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Target Branch</label>
                <select
                  required
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">QR Placement Target</label>
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
                >
                  <option value="Reception">Reception Desk (General Branch)</option>
                  <option value="Staff">Stylist / Doctor / Staff Member</option>
                  <option value="Service">Specific Service</option>
                  <option value="Table">Dining Table</option>
                  <option value="Chair">Service Chair</option>
                </select>
              </div>

              {/* Dynamic Target Input Forms */}
              {targetType === "Staff" && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Choose Staff Profile</label>
                  <select
                    required
                    value={selectedStaff}
                    onChange={(e) => setSelectedStaff(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
                  >
                    <option value="">-- Choose Stylist --</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {targetType === "Service" && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Choose Service Context</label>
                  <select
                    required
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
                  >
                    <option value="">-- Choose Service --</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {(targetType === "Table" || targetType === "Chair") && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Identifier Name/Number</label>
                  <input
                    type="text"
                    required
                    placeholder={`e.g. ${targetType} 4`}
                    value={customTargetId}
                    onChange={(e) => setCustomTargetId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || branches.length === 0}
                className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <QrCode className="h-4 w-4" />
                    <span>Create QR Config</span>
                  </>
                )}
              </button>

            </form>
          </div>

          {/* ACTIVE QR CODES LIST TABLE & METRICS */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
            <h2 className="font-bold text-lg mb-4">Active Placement QR Codes</h2>

            {qrList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 border border-dashed rounded-lg bg-slate-50 dark:bg-slate-950">
                <QrCode className="h-10 w-10 text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">No QR codes created for this business yet.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {qrList.map((qr) => {
                  const m = analyticsData[qr.id] || { scans: 0, conversions: 0, avgRating: 0 };
                  const convRate = m.scans > 0 ? Math.round((m.conversions / m.scans) * 100) : 0;
                  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qr.dynamic_url)}`;

                  return (
                    <div key={qr.id} className="flex flex-col sm:flex-row items-center gap-6 p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/20">
                      
                      {/* QR Render Canvas Area */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={qrImageUrl} 
                        alt="Placement QR" 
                        className="h-28 w-28 border bg-white rounded-lg shadow-sm p-1"
                      />

                      {/* Configurations & Analytics details */}
                      <div className="flex-1 space-y-2 text-center sm:text-left">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-center sm:justify-start">
                          <span className="font-extrabold text-sm text-slate-800 dark:text-slate-200">{qr.target_type}: {qr.target_id}</span>
                          <span className="text-[10px] text-slate-400">({qr.branches.name})</span>
                        </div>

                        {/* Scan Metrics Grid */}
                        <div className="grid grid-cols-4 gap-2 border-t pt-2 border-slate-200 dark:border-slate-800 text-center">
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 uppercase">Scans</span>
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{m.scans}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 uppercase">Feedback</span>
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{m.conversions}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 uppercase">Conv. %</span>
                            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{convRate}%</span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 uppercase">Avg Rating</span>
                            <span className="text-sm font-bold text-yellow-500">{m.avgRating > 0 ? `${m.avgRating} ★` : "-"}</span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2 justify-center sm:justify-start pt-1">
                          <a 
                            href={qrImageUrl} 
                            download={`QR_${qr.target_type}_${qr.target_id}.png`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-2.5 py-1 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs rounded transition"
                          >
                            <Download className="h-3 w-3" />
                            Download
                          </a>
                          <button 
                            onClick={() => window.print()}
                            className="flex items-center gap-1.5 px-2.5 py-1 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs rounded transition"
                          >
                            <Printer className="h-3 w-3" />
                            Print
                          </button>
                          <button 
                            onClick={() => handleDeleteQR(qr.id)}
                            className="flex items-center gap-1.5 px-2.5 py-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs rounded transition ml-auto"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </main>
    </div>
  );
}
