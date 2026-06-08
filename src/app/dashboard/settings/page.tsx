"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  Settings, Save, Globe, Palette, Sparkles, Building, 
  Mail, Image as ImageIcon, Loader2, Star, CheckCircle, 
  AlertCircle, LayoutDashboard, QrCode, MessageSquare, Users,
  Plus, Trash2, MapPin, Phone
} from "lucide-react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";

interface SettingsRecord {
  id: string;
  brand_logo: string | null;
  primary_color: string;
  secondary_color: string;
  custom_domain: string | null;
  favicon_url: string | null;
  email_branding: {
    sender_name?: string;
    sender_email?: string;
    footer_text?: string;
  } | null;
}

export default function SettingsPage() {
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
  const [businessId, setBusinessId] = useState<string | null>(null);

  // Branch Management State
  const [branches, setBranches] = useState<any[]>([]);
  const [branchLimit, setBranchLimit] = useState(1);
  const [subscriptionPlan, setSubscriptionPlan] = useState("Starter");
  const [newBranchName, setNewBranchName] = useState("");
  const [newBranchAddress, setNewBranchAddress] = useState("");
  const [newBranchPhone, setNewBranchPhone] = useState("");
  const [newBranchGoogleUrl, setNewBranchGoogleUrl] = useState("");
  const [addingBranch, setAddingBranch] = useState(false);

  // Settings State
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [secondaryColor, setSecondaryColor] = useState("#475569");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [emailSenderName, setEmailSenderName] = useState("");
  const [emailSenderEmail, setEmailSenderEmail] = useState("");
  const [emailFooterText, setEmailFooterText] = useState("");

  // Domain Verification simulation state
  const [dnsVerified, setDnsVerified] = useState(false);

  useEffect(() => {
    async function loadSettings() {
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

        if (!profile?.tenant_id) {
          setErrorMsg("Account tenant configuration missing.");
          setLoading(false);
          return;
        }

        setTenantId(profile.tenant_id);
        setUserRoleId(profile.role_id);
        setTenantName(profile.tenants?.name || "My Business");
        setRoleName(profile.roles?.name || "Staff");

        const activeTenantId = profile.tenant_id;

        // Fetch branches list
        const { data: branchList } = await supabase
          .from("branches")
          .select("*")
          .eq("tenant_id", activeTenantId);
        if (branchList) setBranches(branchList);

        // Fetch subscription limits
        const { data: subData } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("tenant_id", activeTenantId)
          .single();
        if (subData) {
          setSubscriptionPlan(subData.plan_name);
          const parsedLimits = subData.limits as any;
          setBranchLimit(parsedLimits.branches || 1);
        }

        // Fetch Business profile to link setup
        const { data: business } = await supabase
          .from("businesses")
          .select("id")
          .eq("tenant_id", activeTenantId)
          .single();

        if (business) setBusinessId(business.id);

        // Fetch Settings
        const { data: settingsData } = await supabase
          .from("settings")
          .select("*")
          .eq("tenant_id", activeTenantId)
          .single();

        if (settingsData) {
          setSettingsId(settingsData.id);
          if (settingsData.brand_logo) setLogoUrl(settingsData.brand_logo);
          if (settingsData.primary_color) setPrimaryColor(settingsData.primary_color);
          if (settingsData.secondary_color) setSecondaryColor(settingsData.secondary_color);
          if (settingsData.favicon_url) setFaviconUrl(settingsData.favicon_url);
          if (settingsData.custom_domain) {
            setCustomDomain(settingsData.custom_domain);
            setDnsVerified(true); // Mock CNAME verification
          }
          if (settingsData.email_branding) {
            const eb = settingsData.email_branding as any;
            if (eb.sender_name) setEmailSenderName(eb.sender_name);
            if (eb.sender_email) setEmailSenderEmail(eb.sender_email);
            if (eb.footer_text) setEmailFooterText(eb.footer_text);
          }
        }
      } catch (err) {
        setErrorMsg("Failed to query white label settings.");
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [router, supabase]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const payload = {
        tenant_id: tenantId,
        business_id: businessId,
        brand_logo: logoUrl || null,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        custom_domain: customDomain || null,
        favicon_url: faviconUrl || null,
        email_branding: {
          sender_name: emailSenderName,
          sender_email: emailSenderEmail,
          footer_text: emailFooterText
        }
      };

      let saveErr = null;
      if (settingsId) {
        // Update existing setting profile
        const { error } = await supabase
          .from("settings")
          .update(payload)
          .eq("id", settingsId);
        saveErr = error;
      } else {
        // Create new setting record
        const { data: newRec, error } = await supabase
          .from("settings")
          .insert(payload)
          .select()
          .single();
        if (newRec) setSettingsId(newRec.id);
        saveErr = error;
      }

      if (saveErr) throw saveErr;

      // Update brand parameter assets in main business record
      if (businessId) {
        await supabase
          .from("businesses")
          .update({
            logo_url: logoUrl || null,
            brand_colors: { primary: primaryColor, secondary: secondaryColor }
          })
          .eq("id", businessId);
      }

      setSuccessMsg("White Label parameters saved successfully!");
      if (customDomain) {
        setDnsVerified(true);
      } else {
        setDnsVerified(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save white label configurations.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !businessId) return;

    if (branches.length >= branchLimit) {
      setErrorMsg(`Branch limit reached (${branchLimit} max). Please upgrade your subscription plan in the Billing section to add more branch locations.`);
      return;
    }

    setAddingBranch(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { data: newBranch, error } = await supabase
        .from("branches")
        .insert({
          tenant_id: tenantId,
          business_id: businessId,
          name: newBranchName,
          address: newBranchAddress,
          phone: newBranchPhone,
          google_review_url: newBranchGoogleUrl
        })
        .select()
        .single();

      if (error) throw error;

      setBranches([...branches, newBranch]);
      setSuccessMsg(`Branch "${newBranchName}" added successfully!`);
      setNewBranchName("");
      setNewBranchAddress("");
      setNewBranchPhone("");
      setNewBranchGoogleUrl("");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to add branch location.");
    } finally {
      setAddingBranch(false);
    }
  };

  const handleDeleteBranch = async (id: string, name: string) => {
    if (branches.length <= 1) {
      alert("You must keep at least one branch location.");
      return;
    }
    if (!confirm(`Are you sure you want to delete branch "${name}"?`)) return;

    try {
      const { error } = await supabase
        .from("branches")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setBranches(branches.filter((b) => b.id !== id));
      setSuccessMsg(`Branch "${name}" deleted successfully.`);
    } catch (err: any) {
      alert(err.message || "Failed to delete branch.");
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      
      <Sidebar tenantName={tenantName} roleName={roleName} userRoleId={userRoleId} />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">White-Label Customization Settings</h1>
            <p className="text-slate-500 dark:text-slate-400">Modify logos, hex colors, transactional email brandings, and CNAME domains.</p>
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

        <form onSubmit={handleSaveSettings} className="grid gap-8 lg:grid-cols-3">
          
          <div className="lg:col-span-2 space-y-6">
            
            {/* BRANDING SETUP SECTION */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
              <h2 className="font-bold text-lg border-b pb-2 flex items-center gap-2">
                <Palette className="h-5 w-5 text-blue-600" />
                Visual Identity Setup
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Brand Logo Link</label>
                  <input
                    type="url"
                    placeholder="https://yourdomain.com/logo.png"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Primary Theme Color</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-10 w-12 cursor-pointer border rounded bg-slate-50 border-slate-200"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Secondary Theme Color</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="h-10 w-12 cursor-pointer border rounded bg-slate-50 border-slate-200"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Custom Favicon URL</label>
                  <input
                    type="url"
                    placeholder="https://yourdomain.com/favicon.ico"
                    value={faviconUrl}
                    onChange={(e) => setFaviconUrl(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* EMAIL BRANDING SECTION */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
              <h2 className="font-bold text-lg border-b pb-2 flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600" />
                Custom Transactional Email Settings
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Sender Sender Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Bella Salon Support"
                    value={emailSenderName}
                    onChange={(e) => setEmailSenderName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Sender Verification Email</label>
                  <input
                    type="email"
                    placeholder="reviews@yourdomain.com"
                    value={emailSenderEmail}
                    onChange={(e) => setEmailSenderEmail(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Email Footer Signature Text</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. You received this because you visited Bella Spa."
                    value={emailFooterText}
                    onChange={(e) => setEmailFooterText(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs focus:outline-none resize-none"
                  />
                </div>
              </div>
            </div>

            {/* CUSTOM DOMAINS DNS PANEL */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
              <h2 className="font-bold text-lg border-b pb-2 flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-600" />
                Custom Web Domains & Routing
              </h2>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Custom Domain Name</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. reviews.mybusiness.com"
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value)}
                      className="flex-1 px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
                    />
                    {customDomain && (
                      <span className={`flex items-center gap-1 text-[10px] font-bold px-3.5 py-1 rounded-lg ${
                        dnsVerified ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400' :
                        'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400'
                      }`}>
                        {dnsVerified ? "CNAME Verified" : "Pending DNS"}
                      </span>
                    )}
                  </div>
                </div>

                {/* DNS Instructions */}
                {customDomain && (
                  <div className="p-4 border rounded-xl bg-slate-50 dark:bg-slate-950 text-xs space-y-2">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200">DNS Setup Instructions</h4>
                    <p className="text-slate-500">
                      Access your domain registrar (GoDaddy, Namecheap, Route53) and append the following DNS record:
                    </p>
                    <div className="grid grid-cols-3 gap-2 border-t pt-2 border-slate-200 dark:border-slate-800 text-[10px] font-mono">
                      <div>
                        <span className="block font-bold text-slate-400 uppercase text-[8px]">Type</span>
                        <span>CNAME</span>
                      </div>
                      <div>
                        <span className="block font-bold text-slate-400 uppercase text-[8px]">Host / Name</span>
                        <span>{customDomain.split(".")[0]}</span>
                      </div>
                      <div>
                        <span className="block font-bold text-slate-400 uppercase text-[8px]">Points To</span>
                        <span>cname.reviewflowai.com</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* BRANCH LOCATIONS PANEL */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
              <h2 className="font-bold text-lg border-b pb-2 flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <MapPin className="h-5 w-5 text-blue-600" />
                Manage Branch Locations ({branches.length} / {branchLimit > 1000 ? "Unlimited" : branchLimit})
              </h2>

              {/* List of existing branches */}
              <div className="space-y-3">
                {branches.map((b) => (
                  <div key={b.id} className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1 bg-transparent">
                      <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">{b.name}</h3>
                      {b.address && <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {b.address}</p>}
                      {b.phone && <p className="text-xs text-slate-500 flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {b.phone}</p>}
                      {b.google_review_url && (
                        <a 
                          href={b.google_review_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-[10px] text-blue-600 hover:underline block truncate max-w-xs"
                        >
                          Google Link: {b.google_review_url}
                        </a>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteBranch(b.id, b.name)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 p-2 rounded-lg transition shrink-0 self-end sm:self-center"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add a branch form */}
              {branches.length < branchLimit ? (
                <div className="border-t pt-4 space-y-4">
                  <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Plus className="h-4 w-4 text-blue-600" />
                    Add New Location
                  </h3>
                  
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Branch Name</label>
                      <input
                        type="text"
                        placeholder="e.g. West Side Branch"
                        value={newBranchName}
                        onChange={(e) => setNewBranchName(e.target.value)}
                        className="w-full px-3 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Phone Number</label>
                      <input
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        value={newBranchPhone}
                        onChange={(e) => setNewBranchPhone(e.target.value)}
                        className="w-full px-3 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Physical Address</label>
                      <input
                        type="text"
                        placeholder="e.g. 456 Boulevard St, City"
                        value={newBranchAddress}
                        onChange={(e) => setNewBranchAddress(e.target.value)}
                        className="w-full px-3 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Google Review Redirect URL</label>
                      <input
                        type="url"
                        placeholder="https://g.page/r/YOUR_ID/review"
                        value={newBranchGoogleUrl}
                        onChange={(e) => setNewBranchGoogleUrl(e.target.value)}
                        className="w-full px-3 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddBranch}
                    disabled={addingBranch || !newBranchName}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition disabled:opacity-50"
                  >
                    {addingBranch ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Location</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="p-4 border border-yellow-200 bg-yellow-50 text-yellow-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>
                    You have reached the limit of **{branchLimit} branch** allowed on your **{subscriptionPlan} Plan**. 
                    Please upgrade your plan in the **Billing** section to add more locations.
                  </span>
                </div>
              )}
            </div>

          </div>

          {/* SAVE BUTTON & LIVE WHITE LABEL PREVIEW SIDEBAR */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm shadow transition"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Brand Configuration</span>
                  </>
                )}
              </button>
            </div>

            {/* LIVE FUNNEL PREVIEW MOCKUP */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-blue-500" />
                Live Funnel Mockup Preview
              </h3>

              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-md bg-slate-50 dark:bg-slate-950 flex flex-col h-[280px]">
                {/* Header Mockup */}
                <div className="h-10 px-3 bg-white dark:bg-slate-900 border-b flex items-center justify-center shadow-sm shrink-0">
                  <div className="flex items-center gap-1.5">
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt="Logo" className="h-5 w-auto object-contain" />
                    ) : (
                      <div className="h-5 w-5 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[8px] font-bold text-slate-400">
                        {tenantName.charAt(0)}
                      </div>
                    )}
                    <span className="font-extrabold text-xs">{tenantName}</span>
                  </div>
                </div>

                {/* Funnel Body Mockup */}
                <div className="flex-1 flex flex-col items-center justify-center p-4 text-center space-y-4">
                  <span className="text-xs font-extrabold">How was your experience today?</span>
                  
                  {/* Mock ratings */}
                  <div className="flex gap-2">
                    {["😡", "🙁", "🙂", "😊", "😍"].map((emoji, idx) => (
                      <span 
                        key={idx} 
                        className={`text-xl p-1.5 rounded-lg border bg-white dark:bg-slate-900 ${idx >= 3 ? 'border-yellow-300' : 'border-slate-100 dark:border-slate-800'}`}
                      >
                        {emoji}
                      </span>
                    ))}
                  </div>

                  <button
                    type="button"
                    style={{ backgroundColor: primaryColor }}
                    className="w-full text-[10px] font-bold text-white py-2 rounded-lg transition"
                  >
                    Submit Feedback
                  </button>
                </div>
              </div>
            </div>
          </div>

        </form>

      </main>
    </div>
  );
}
