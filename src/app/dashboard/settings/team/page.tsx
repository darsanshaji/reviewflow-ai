"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  Users, UserPlus, Trash2, Mail, Shield, ChevronRight, 
  Loader2, AlertCircle, CheckCircle, ArrowLeft, Copy, Check, Clock, Sparkles
} from "lucide-react";
import Sidebar from "@/components/Sidebar";

interface MemberRecord {
  id: string;
  name: string;
  role_id: number;
  roles: { name: string } | null;
}

interface InvitationRecord {
  id: string;
  email: string;
  role_id: number;
  token: string;
  status: string;
  created_at: string;
}

export default function TeamManagementPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Context Context
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState("");
  const [roleName, setRoleName] = useState("Staff");
  const [userRoleId, setUserRoleId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Lists Data
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [invitations, setInvitations] = useState<InvitationRecord[]>([]);

  // Invite Form State
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState(3); // Default to Manager
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);

  async function loadTeamData() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      setCurrentUserId(session.user.id);

      const { data: profile } = (await supabase
        .from("users")
        .select("tenant_id, role_id, roles(name), tenants(name)")
        .eq("id", session.user.id)
        .single()) as any;

      if (!profile?.tenant_id) {
        setErrorMsg("Tenant organization context missing.");
        setLoading(false);
        return;
      }

      setTenantId(profile.tenant_id);
      setUserRoleId(profile.role_id);
      setTenantName(profile.tenants?.name || "My Business");
      setRoleName(profile.roles?.name || "Staff");

      // Verify Permissions: Only Owner (2) and Super Admin (1) can manage team
      if (profile.role_id !== 1 && profile.role_id !== 2) {
        setErrorMsg("Access Denied: Only Business Owners can access team management.");
        setLoading(false);
        return;
      }

      // 1. Fetch active members
      const { data: membersData } = await supabase
        .from("users")
        .select(`
          id,
          name,
          role_id,
          roles ( name )
        `)
        .eq("tenant_id", profile.tenant_id)
        .order("name", { ascending: true });

      if (membersData) setMembers(membersData as any);

      // 2. Fetch pending invitations
      const { data: invitesData } = await supabase
        .from("invitations")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (invitesData) setInvitations(invitesData);

    } catch (err: any) {
      setErrorMsg("Failed to query team configuration lists.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeamData();
  }, [router, supabase]);

  // Handle Invitation Generation
  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !inviteEmail) return;

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");
    setGeneratedLink("");

    try {
      // Create invitation
      const { data: newInvite, error: inviteErr } = await supabase
        .from("invitations")
        .insert({
          tenant_id: tenantId,
          email: inviteEmail.trim(),
          role_id: inviteRoleId,
          status: "pending"
        })
        .select()
        .single();

      if (inviteErr) throw inviteErr;

      if (newInvite) {
        setInvitations([newInvite, ...invitations]);
        
        // Build the copyable signup link
        const host = typeof window !== "undefined" ? window.location.origin : "https://reviewflowai.com";
        const inviteUrl = `${host}/login?invite=${newInvite.token}`;
        setGeneratedLink(inviteUrl);
        
        setSuccessMsg(`Invitation successfully created for ${inviteEmail}!`);
        setInviteEmail("");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to generate user invitation.");
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel Invitation
  const handleCancelInvite = async (inviteId: string, email: string) => {
    if (!confirm(`Are you sure you want to cancel the invitation for ${email}?`)) return;

    try {
      const { error } = await supabase
        .from("invitations")
        .delete()
        .eq("id", inviteId);

      if (error) throw error;
      setInvitations(invitations.filter(i => i.id !== inviteId));
      setSuccessMsg(`Invitation for ${email} cancelled.`);
    } catch (err: any) {
      alert("Failed to cancel invitation.");
    }
  };

  // Remove/Disable Team Member
  const handleRemoveMember = async (memberId: string, name: string) => {
    if (memberId === currentUserId) {
      alert("You cannot remove yourself from the workspace.");
      return;
    }
    if (!confirm(`Are you sure you want to remove ${name} from your organization? they will lose dashboard access.`)) return;

    try {
      // Deassociate from tenant
      const { error } = await supabase
        .from("users")
        .update({ tenant_id: null })
        .eq("id", memberId);

      if (error) throw error;
      setMembers(members.filter(m => m.id !== memberId));
      setSuccessMsg(`${name} was successfully removed from the workspace.`);
    } catch (err: any) {
      alert("Failed to remove team member.");
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-sm text-slate-500 font-semibold">Loading team workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      
      <Sidebar tenantName={tenantName} roleName={roleName} userRoleId={userRoleId} />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8">
        
        {/* Header */}
        <header className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push("/dashboard/settings")}
            className="p-2 border rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-600" />
              Team & Organization Management
            </h1>
            <p className="text-slate-500 dark:text-slate-400">Invite managers and staff, review workspace permissions, and audit active members.</p>
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
          
          {/* Member List & Invitation List */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* ACTIVE TEAM MEMBERS LIST */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
              <h2 className="font-bold text-base border-b pb-2 flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Active Workspace Members ({members.length})
              </h2>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {members.map((member) => (
                  <div key={member.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <span className="font-extrabold text-sm text-slate-800 dark:text-slate-200 block">{member.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono block">ID: {member.id}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        member.role_id === 2 ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400' :
                        member.role_id === 3 ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400' :
                        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {member.roles?.name || "Staff"}
                      </span>

                      {member.id !== currentUserId && member.role_id !== 2 && (
                        <button
                          onClick={() => handleRemoveMember(member.id, member.name)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 p-2 rounded-lg transition shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PENDING INVITATIONS LIST */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
              <h2 className="font-bold text-base border-b pb-2 flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Pending Invitations ({invitations.length})
              </h2>

              {invitations.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No pending invitations for this workspace.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {invitations.map((invite) => {
                    const host = typeof window !== "undefined" ? window.location.origin : "";
                    const link = `${host}/login?invite=${invite.token}`;
                    return (
                      <div key={invite.id} className="py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="space-y-0.5">
                          <span className="font-extrabold text-sm text-slate-800 dark:text-slate-200 block">{invite.email}</span>
                          <span className="text-[10px] text-slate-450 block flex items-center gap-1">
                            Role: {invite.role_id === 3 ? "Manager" : invite.role_id === 4 ? "Receptionist" : "Staff"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(link);
                              alert("Invitation link copied!");
                            }}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 border rounded-lg bg-slate-50 hover:bg-slate-100 text-[10px] font-bold text-slate-600 dark:bg-slate-950 dark:hover:bg-slate-800 dark:text-slate-300 transition"
                          >
                            <Copy className="h-3 w-3" />
                            Copy Invite Link
                          </button>
                          
                          <button
                            onClick={() => handleCancelInvite(invite.id, invite.email)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 p-2 rounded-lg transition shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Invitation Form & Link Generator Card */}
          <div className="space-y-6">
            
            {/* INVITE NEW MEMBER FORM CARD */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-base flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-600" />
                Invite New Teammate
              </h3>

              <form onSubmit={handleInviteUser} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Employee Email</label>
                  <input
                    type="email"
                    required
                    placeholder="teammate@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Workspace Role</label>
                  <select
                    value={inviteRoleId}
                    onChange={(e) => setInviteRoleId(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
                  >
                    <option value="3">Manager (Attribution & branches)</option>
                    <option value="4">Receptionist (Triggers reviews)</option>
                    <option value="5">Staff (Personal metrics view)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !inviteEmail}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      <span>Generate Invitation</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* GENERATED LINK DISPLAY CARD */}
            {generatedLink && (
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-xl p-6 shadow-sm space-y-4 animate-in fade-in zoom-in-95 duration-250">
                <h4 className="font-bold text-xs uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" />
                  Invite Link Generated!
                </h4>
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  Send this unique invitation signup URL to your teammate. When they register, they will automatically join your organization workspace.
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedLink}
                    className="flex-1 px-3 py-1.5 border rounded-lg bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900 text-xs font-mono focus:outline-none select-all"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center transition"
                    title="Copy Link"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>

      </main>
    </div>
  );
}
