"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  Settings, Save, Globe, Palette, Sparkles, Building, 
  Mail, Image as ImageIcon, Loader2, Star, CheckCircle, 
  AlertCircle, LayoutDashboard, QrCode, MessageSquare, Users,
  Plus, Trash2, MapPin, Phone, Upload, ChevronRight
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
    funnel_heading?: string;
    funnel_subheading?: string;
    funnel_emojis?: Array<{ rating: number; emoji: string; label: string }>;
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

  // Customizable Funnel Branding
  const [funnelHeading, setFunnelHeading] = useState("How was your experience today?");
  const [funnelSubheading, setFunnelSubheading] = useState("Your feedback helps us provide better service.");
  const [funnelEmojis, setFunnelEmojis] = useState<Array<{ rating: number; emoji: string; label: string }>>([
    { rating: 1, emoji: "😡", label: "Poor" },
    { rating: 2, emoji: "🙁", label: "Fair" },
    { rating: 3, emoji: "🙂", label: "Good" },
    { rating: 4, emoji: "😊", label: "Great" },
    { rating: 5, emoji: "😍", label: "Outstanding" },
  ]);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Live Funnel Mockup Simulator States
  const [previewState, setPreviewState] = useState<"rating" | "low_feedback" | "high_thankyou" | "submitted">("rating");
  const [previewRating, setPreviewRating] = useState<number | null>(null);

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
        setUserRoleId(userRoleIdVal);
        setTenantName(tenantNameVal);
        setRoleName(roleNameVal);

        const activeTenantId = tenantIdVal;

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
            if (eb.funnel_heading) setFunnelHeading(eb.funnel_heading);
            if (eb.funnel_subheading) setFunnelSubheading(eb.funnel_subheading);
            if (eb.funnel_emojis) setFunnelEmojis(eb.funnel_emojis);
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
          footer_text: emailFooterText,
          funnel_heading: funnelHeading,
          funnel_subheading: funnelSubheading,
          funnel_emojis: funnelEmojis
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

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenantId) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("File size exceeds 2MB limit.");
      return;
    }

    setUploadingLogo(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `logos/${tenantId}-${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from("logos")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from("logos")
        .getPublicUrl(fileName);

      if (publicUrlData?.publicUrl) {
        setLogoUrl(publicUrlData.publicUrl);
        setSuccessMsg("Logo uploaded successfully. Remember to save brand configuration!");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to upload logo image. Make sure the 'logos' storage bucket exists in your Supabase project.");
    } finally {
      setUploadingLogo(false);
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
                  <label className="text-xs font-semibold text-slate-500 uppercase">Brand Logo</label>
                  <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                    {logoUrl ? (
                      <div className="relative h-16 w-16 bg-white border rounded-lg p-2 flex items-center justify-center shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
                        <button
                          type="button"
                          onClick={() => setLogoUrl("")}
                          className="absolute -top-1.5 -right-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-full p-1 transition"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="h-16 w-16 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                    )}
                    
                    <div className="flex-1 w-full space-y-2">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        {/* File Upload Button */}
                        <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold rounded-lg text-xs cursor-pointer transition">
                          <Upload className="h-4 w-4 text-slate-400" />
                          <span>{uploadingLogo ? "Uploading..." : "Upload Logo Image"}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoFileChange}
                            disabled={uploadingLogo}
                            className="hidden"
                          />
                        </label>
                        
                        <div className="text-center py-1 text-slate-400 text-xs font-medium shrink-0">or</div>
                        
                        {/* URL input */}
                        <input
                          type="url"
                          placeholder="Paste logo image URL"
                          value={logoUrl}
                          onChange={(e) => setLogoUrl(e.target.value)}
                          className="flex-[2] px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs focus:outline-none"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400">Supported formats: PNG, JPG, GIF, SVG. Max size 2MB.</p>
                    </div>
                  </div>
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

            {/* REVIEW FUNNEL CUSTOMIZATION SECTION */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
              <h2 className="font-bold text-lg border-b pb-2 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-600" />
                Review Funnel Customization
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Funnel Heading Text</label>
                  <input
                    type="text"
                    value={funnelHeading}
                    onChange={(e) => setFunnelHeading(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
                    placeholder="e.g. How was your experience today?"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Funnel Subheading Text</label>
                  <input
                    type="text"
                    value={funnelSubheading}
                    onChange={(e) => setFunnelSubheading(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
                    placeholder="e.g. Your feedback helps us provide better service."
                  />
                </div>

                <div className="sm:col-span-2 space-y-3 pt-2">
                  <label className="text-xs font-bold text-slate-500 uppercase block border-b pb-1 dark:border-slate-800">
                    Emoji Scale Ratings (1 - 5 stars)
                  </label>
                  
                  <div className="space-y-3">
                    {funnelEmojis.map((item, idx) => (
                      <div key={item.rating} className="flex items-center gap-4 p-3 border rounded-lg bg-slate-50/50 dark:bg-slate-950/30 border-slate-100 dark:border-slate-800/80">
                        <span className="text-sm font-bold text-slate-400 dark:text-slate-500 shrink-0 w-16">
                          Rating {item.rating}
                        </span>
                        
                        <div className="w-16 space-y-1">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase">Emoji</label>
                          <input
                            type="text"
                            maxLength={2}
                            value={item.emoji}
                            onChange={(e) => {
                              const newEmojis = [...funnelEmojis];
                              newEmojis[idx].emoji = e.target.value;
                              setFunnelEmojis(newEmojis);
                            }}
                            className="w-full text-center px-2 py-1.5 border rounded bg-white dark:bg-slate-900 border-slate-200 text-base focus:outline-none"
                          />
                        </div>

                        <div className="flex-1 space-y-1">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase">Text Label</label>
                          <input
                            type="text"
                            value={item.label}
                            onChange={(e) => {
                              const newEmojis = [...funnelEmojis];
                              newEmojis[idx].label = e.target.value;
                              setFunnelEmojis(newEmojis);
                            }}
                            className="w-full px-3 py-1.5 border rounded bg-white dark:bg-slate-900 border-slate-200 text-xs focus:outline-none"
                            placeholder="e.g. Good"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* TEAM & MEMBERS SECTION */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
              <h2 className="font-bold text-lg border-b pb-2 flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Team & Collaborators
              </h2>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-transparent">
                <div className="space-y-1 bg-transparent">
                  <p className="text-xs text-slate-500">
                    Invite managers, receptionists, or staff members to collaborate in your organization workspace.
                  </p>
                </div>
                <Link
                  href="/dashboard/settings/team"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition shrink-0"
                >
                  <span>Manage & Invite Team</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
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
                      <div className="flex flex-col gap-1 mt-1">
                        {b.google_review_url && (
                          <a 
                            href={b.google_review_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-[10px] text-slate-500 dark:text-slate-400 hover:underline block truncate max-w-xs"
                          >
                            <span className="font-bold text-slate-600 dark:text-slate-300">Google Link:</span> {b.google_review_url}
                          </a>
                        )}
                        <a 
                          href={`/review/${b.id}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline block truncate max-w-xs"
                        >
                          <span className="font-bold">Review Funnel URL:</span> {typeof window !== "undefined" ? window.location.origin : ""}/review/{b.id}
                        </a>
                      </div>
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

              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-md bg-slate-50 dark:bg-slate-950 flex flex-col h-[320px]">
                {/* Header Mockup */}
                <div className="h-10 px-3 bg-white dark:bg-slate-900 border-b flex items-center justify-between shadow-sm shrink-0">
                  <div className="flex items-center gap-1.5 bg-transparent">
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt="Logo" className="h-5 w-auto object-contain" />
                    ) : (
                      <div className="h-5 w-5 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[8px] font-bold text-slate-400">
                        {tenantName.charAt(0)}
                      </div>
                    )}
                    <span className="font-extrabold text-[10px] truncate max-w-[100px]">{tenantName}</span>
                  </div>
                  
                  {previewState !== "rating" && (
                    <button
                      type="button"
                      onClick={() => setPreviewState("rating")}
                      className="text-[9px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-0.5"
                    >
                      Reset Sim
                    </button>
                  )}
                </div>

                {/* Funnel Body Mockup */}
                <div className="flex-1 flex flex-col items-center justify-center p-4 text-center overflow-y-auto bg-transparent">
                  {previewState === "rating" && (
                    <div className="space-y-3 w-full bg-transparent">
                      <span className="text-xs font-extrabold block leading-tight">
                        {funnelHeading || "How was your experience today?"}
                      </span>
                      <p className="text-[9px] text-slate-500 dark:text-slate-400 max-w-[200px] mx-auto leading-tight block">
                        {funnelSubheading || "Your feedback helps us provide better service."}
                      </p>
                      
                      {/* Interactive Ratings */}
                      <div className="flex gap-1.5 justify-center flex-wrap bg-transparent">
                        {funnelEmojis.map((item, idx) => (
                          <div key={item.rating} className="flex flex-col items-center gap-0.5 bg-transparent">
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewRating(item.rating);
                                if (item.rating <= 3) {
                                  setPreviewState("low_feedback");
                                } else {
                                  setPreviewState("high_thankyou");
                                }
                              }}
                              className={`text-lg p-1.5 rounded-lg border bg-white dark:bg-slate-900 transition hover:scale-110 active:scale-95 cursor-pointer ${idx >= 3 ? 'border-yellow-300' : 'border-slate-100 dark:border-slate-800'}`}
                              title={item.label}
                            >
                              {item.emoji}
                            </button>
                            <span className="text-[8px] text-slate-400 font-medium truncate max-w-[38px]">
                              {item.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {previewState === "low_feedback" && (
                    <div className="space-y-3 w-full text-left bg-transparent">
                      <div className="border-b pb-1 text-center bg-transparent">
                        <h4 className="text-[10px] font-bold">We appreciate your feedback</h4>
                        <p className="text-[8px] text-slate-500">What disappointed you today?</p>
                      </div>
                      
                      <div className="space-y-1 bg-transparent">
                        <label className="text-[7px] font-bold text-slate-400 uppercase">Select Reasons</label>
                        <div className="grid grid-cols-2 gap-1 text-[8px] bg-transparent">
                          <span className="p-1 border rounded bg-white text-slate-600 block">Waiting Time</span>
                          <span className="p-1 border rounded bg-white text-slate-600 block">Service Quality</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setPreviewState("submitted")}
                        style={{ backgroundColor: primaryColor }}
                        className="w-full text-[9px] font-bold text-white py-1.5 rounded-lg transition"
                      >
                        Submit Private Feedback
                      </button>
                    </div>
                  )}

                  {previewState === "high_thankyou" && (
                    <div className="space-y-3 w-full text-center bg-transparent">
                      <div className="text-2xl">🎉</div>
                      <h4 className="text-[10px] font-bold">Thank you for your review!</h4>
                      <p className="text-[8px] text-slate-500">We would love it if you shared your experience publicly on Google.</p>
                      
                      <button
                        type="button"
                        onClick={() => setPreviewState("submitted")}
                        style={{ backgroundColor: primaryColor }}
                        className="w-full text-[9px] font-bold text-white py-1.5 rounded-lg transition flex items-center justify-center gap-1"
                      >
                        <span>Leave a Review on Google</span>
                      </button>
                    </div>
                  )}

                  {previewState === "submitted" && (
                    <div className="space-y-2 w-full text-center py-4 bg-transparent">
                      <div className="text-3xl text-green-500">✓</div>
                      <h4 className="text-[10px] font-bold">Thank You!</h4>
                      <p className="text-[8px] text-slate-500">Your feedback has been successfully processed.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

        </form>

      </main>
    </div>
  );
}
