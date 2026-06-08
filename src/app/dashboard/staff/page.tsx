"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  Users, Plus, Star, Award, ShieldAlert, 
  Trash2, Mail, Phone, MapPin, Building,
  Loader2, LayoutDashboard, QrCode, ClipboardList 
} from "lucide-react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";

interface StaffRecord {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  branch_id: string;
  branches: { name: string } | null;
  avgRating?: number;
  totalFeedback?: number;
  reviewsGenerated?: number;
}

export default function StaffManagerPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // RBAC Roles context
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<number | null>(null); // 1: Admin, 2: Owner, 3: Manager, 5: Staff
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState("");

  // Data lists
  const [staffList, setStaffList] = useState<StaffRecord[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);

  // Add Staff Form State
  const [staffName, setStaffName] = useState("");
  const [staffRole, setStaffRole] = useState("Stylist");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPhone, setStaffPhone] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");

  useEffect(() => {
    async function loadStaffAndContext() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/login");
          return;
        }

        setUserId(session.user.id);

        // Fetch User profile to get role and tenant context
        const { data: profile, error: profileErr } = (await supabase
          .from("users")
          .select("tenant_id, role_id, tenants(name)")
          .eq("id", session.user.id)
          .single()) as any;

        if (profileErr || !profile) throw profileErr || new Error("Profile context not found");

        setUserRole(profile.role_id);
        setTenantId(profile.tenant_id);
        setTenantName(profile.tenants?.name || "My Business");

        const activeTenantId = profile.tenant_id;

        // Fetch Branches
        const { data: branchData } = await supabase
          .from("branches")
          .select("id, name")
          .eq("tenant_id", activeTenantId);
        if (branchData) {
          setBranches(branchData);
          if (branchData.length > 0) setSelectedBranch(branchData[0].id);
        }

        // Fetch Staff
        const { data: rawStaff } = await supabase
          .from("staff")
          .select(`
            id,
            name,
            role,
            email,
            phone,
            branch_id,
            branches ( name )
          `)
          .eq("tenant_id", activeTenantId);

        // Fetch Feedback to aggregate staff metrics
        const { data: feedbackData } = await supabase
          .from("feedback")
          .select("rating, staff_id")
          .eq("tenant_id", activeTenantId);

        // Fetch analytics review clicks to calculate public reviews generated
        const { data: reviewClicks } = await supabase
          .from("analytics_events")
          .select("metadata")
          .eq("tenant_id", activeTenantId)
          .eq("event_type", "review_click");

        // Parse metrics per staff member
        const compiledStaff: StaffRecord[] = (rawStaff || []).map((member: any) => {
          const matchingFeedback = feedbackData?.filter((fb) => fb.staff_id === member.id) || [];
          const totalFB = matchingFeedback.length;
          const avgStars = totalFB > 0 
            ? parseFloat((matchingFeedback.reduce((sum, f) => sum + f.rating, 0) / totalFB).toFixed(1))
            : 0;

          // Reviews generated (high rating feedbacks or attributed redirection clicks)
          const reviewsGen = matchingFeedback.filter((fb) => fb.rating >= 4).length;

          return {
            ...member,
            avgRating: avgStars,
            totalFeedback: totalFB,
            reviewsGenerated: reviewsGen
          };
        });

        // Filter and display context based on RBAC rules
        if (profile.role_id === 5) {
          // Staff Role can only see their own metrics! (Enforcing RBAC isolation)
          const staffSelf = compiledStaff.filter((s) => s.email.toLowerCase() === session.user.email?.toLowerCase());
          setStaffList(staffSelf);
        } else {
          // Admins, Owners, and Managers see all staff and can rank them
          // Order staff by rating (highest first) and total feedback volume
          compiledStaff.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0) || (b.totalFeedback || 0) - (a.totalFeedback || 0));
          setStaffList(compiledStaff);
        }

      } catch (err: any) {
        setErrorMsg("Failed to load staff records.");
      } finally {
        setLoading(false);
      }
    }
    loadStaffAndContext();
  }, [router, supabase]);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !selectedBranch) return;

    setSubmitting(true);
    setErrorMsg("");

    try {
      const { data: newStaff, error } = await supabase
        .from("staff")
        .insert({
          tenant_id: tenantId,
          branch_id: selectedBranch,
          name: staffName,
          role: staffRole,
          email: staffEmail,
          phone: staffPhone
        })
        .select(`
          id,
          name,
          role,
          email,
          phone,
          branch_id,
          branches ( name )
        `)
        .single();

      if (error) throw error;

      const newRecord: StaffRecord = {
        ...(newStaff as any),
        avgRating: 0.0,
        totalFeedback: 0,
        reviewsGenerated: 0
      };

      setStaffList([...staffList, newRecord]);

      // Reset form fields
      setStaffName("");
      setStaffEmail("");
      setStaffPhone("");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create staff profile.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm("Are you sure you want to delete this staff profile?")) return;

    try {
      const { error } = await supabase
        .from("staff")
        .delete()
        .eq("id", id);
      if (error) throw error;

      setStaffList(staffList.filter((s) => s.id !== id));
    } catch (err) {
      alert("Failed to delete staff member.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-sm text-slate-500 font-medium">Loading Staff Analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      
      {/* Sidebar */}
      <Sidebar tenantName={tenantName} roleName={userRole === 5 ? "Staff" : userRole === 3 ? "Manager" : userRole === 2 ? "Owner" : "Administrator"} userRoleId={userRole} />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Staff Management & Analytics</h1>
            <p className="text-slate-500 dark:text-slate-400">
              {userRole === 5 ? "Viewing personal performance details" : "Track performance rankings and onboard stylists."}
            </p>
          </div>
        </header>

        {errorMsg && (
          <div className="mb-6 p-4 border border-red-200 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          
          {/* STAFF ONBOARDING FORM (HIDDEN FOR ROLE 5 - STAFF PERMISSIONS ENFORCED) */}
          {userRole !== 5 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm h-max">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-600" />
                Add Staff Profile
              </h2>

              <form onSubmit={handleAddStaff} className="space-y-4">
                
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Connor"
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Role / Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Master Stylist"
                    value={staffRole}
                    onChange={(e) => setStaffRole(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="sarah@salon.com"
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={staffPhone}
                    onChange={(e) => setStaffPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Assign Branch</label>
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

                <button
                  type="submit"
                  disabled={submitting || branches.length === 0}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Users className="h-4 w-4" />
                      <span>Onboard Stylist</span>
                    </>
                  )}
                </button>

              </form>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm h-max text-center space-y-3">
              <ShieldAlert className="h-10 w-10 text-blue-600 mx-auto" />
              <h3 className="font-bold text-sm">Personal Scoreboard Portal</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You are accessing review metrics isolated to your profile. Owner configuration controls are hidden for this session.
              </p>
            </div>
          )}

          {/* STAFF LEADERBOARD & ANALYTICS */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500 fill-current" />
              Performance Leaderboard
            </h2>

            {staffList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 border border-dashed rounded-lg bg-slate-50 dark:bg-slate-950">
                <Users className="h-10 w-10 text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">No staff members found matching criteria.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {staffList.map((st, idx) => (
                  <div key={st.id} className="flex flex-col sm:flex-row items-center justify-between p-4 border rounded-xl bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 gap-4">
                    
                    {/* Member Profile */}
                    <div className="flex items-center gap-3">
                      {userRole !== 5 && (
                        <span className="text-xs font-black text-slate-400 h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-850 flex items-center justify-center border">
                          #{idx + 1}
                        </span>
                      )}
                      <div>
                        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">{st.name}</h3>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span>{st.role}</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{st.branches?.name || "Unassigned"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-4 items-center text-center">
                      <div>
                        <span className="block text-[9px] font-bold text-slate-400 uppercase">Feedback</span>
                        <span className="text-xs font-bold">{st.totalFeedback || 0}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-slate-400 uppercase">Reviews</span>
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{st.reviewsGenerated || 0}</span>
                      </div>
                      <div className="bg-yellow-50 dark:bg-yellow-950/10 px-2 py-1 rounded-lg border border-yellow-200 dark:border-yellow-900/50">
                        <span className="block text-[9px] font-bold text-yellow-600 dark:text-yellow-400 uppercase">Stars</span>
                        <span className="text-xs font-black text-yellow-500">
                          {st.avgRating && st.avgRating > 0 ? `${st.avgRating} ★` : "-"}
                        </span>
                      </div>
                      
                      {/* Delete actions (hidden for staff) */}
                      {userRole !== 5 && (
                        <button
                          onClick={() => handleDeleteStaff(st.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 p-1.5 rounded transition ml-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
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
