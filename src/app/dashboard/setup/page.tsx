"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  Building2, Palmtree, Palette, Sparkles, MapPin, 
  Phone, Mail, Globe, ArrowRight, ArrowLeft, Plus, 
  Trash2, Loader2, Star, CheckCircle2, ChevronRight 
} from "lucide-react";

type SetupStep = 1 | 2 | 3;

interface BranchInput {
  name: string;
  address: string;
  phone: string;
  google_review_url: string;
}

export default function BusinessSetupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<SetupStep>(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [userTenantId, setUserTenantId] = useState<string | null>(null);

  // Step 1: Business Profile State
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("Salon");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");

  // Step 2: Branding State
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [secondaryColor, setSecondaryColor] = useState("#475569");

  // Step 3: Branch Structure State
  const [branches, setBranches] = useState<BranchInput[]>([
    { name: "Main Location", address: "", phone: "", google_review_url: "" }
  ]);

  useEffect(() => {
    async function getSessionContext() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      // Retrieve user profile to find their tenant_id
      const { data: profile } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", session.user.id)
        .single();

      if (profile?.tenant_id) {
        setUserTenantId(profile.tenant_id);
      } else {
        // If tenant doesn't exist, generate one for onboarding sandbox
        const { data: newTenant, error: tenantErr } = await supabase
          .from("tenants")
          .insert({ name: `${session.user.email?.split("@")[0]}'s Organization` })
          .select()
          .single();

        if (newTenant) {
          setUserTenantId(newTenant.id);
          // Link user to this tenant
          await supabase
            .from("users")
            .update({ tenant_id: newTenant.id })
            .eq("id", session.user.id);
        } else {
          setErrorMsg("Could not verify tenant context.");
        }
      }
    }
    getSessionContext();
  }, [router, supabase]);

  const handleAddBranch = () => {
    setBranches([
      ...branches,
      { name: `Branch ${branches.length + 1}`, address: "", phone: "", google_review_url: "" }
    ]);
  };

  const handleRemoveBranch = (index: number) => {
    if (branches.length === 1) return;
    setBranches(branches.filter((_, i) => i !== index));
  };

  const handleBranchChange = (index: number, field: keyof BranchInput, value: string) => {
    const updated = [...branches];
    updated[index] = { ...updated[index], [field]: value };
    setBranches(updated);
  };

  const handleOnboardingSubmit = async () => {
    if (!userTenantId) {
      setErrorMsg("Tenant identifier not loaded. Please wait.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      // 1. Insert Business profile
      const { data: business, error: bizErr } = await supabase
        .from("businesses")
        .insert({
          tenant_id: userTenantId,
          name: businessName,
          type: businessType,
          phone,
          email,
          address,
          logo_url: logoUrl,
          brand_colors: { primary: primaryColor, secondary: secondaryColor },
          website
        })
        .select()
        .single();

      if (bizErr) throw bizErr;

      // 2. Insert branches linked to business
      const branchesToInsert = branches.map((b) => ({
        tenant_id: userTenantId,
        business_id: business.id,
        name: b.name,
        address: b.address,
        phone: b.phone,
        google_review_url: b.google_review_url
      }));

      const { error: branchErr } = await supabase
        .from("branches")
        .insert(branchesToInsert);

      if (branchErr) throw branchErr;

      // 3. Set Settings values
      const { error: settingsErr } = await supabase
        .from("settings")
        .insert({
          tenant_id: userTenantId,
          business_id: business.id,
          brand_logo: logoUrl,
          primary_color: primaryColor,
          secondary_color: secondaryColor
        });

      if (settingsErr) throw settingsErr;

      // Redirect back to dashboard overview
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to finalize onboarding setup.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        
        {/* Header Branding */}
        <div className="flex justify-center items-center gap-2 font-bold text-2xl text-blue-600 dark:text-blue-400 mb-6">
          <Star className="h-6 w-6 fill-current" />
          <span>ReviewFlow AI Onboarding</span>
        </div>

        {/* Wizard Steps Progress Header */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm mb-6 flex justify-between items-center px-8">
          <div className="flex items-center gap-2">
            <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>1</span>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Business Profile</span>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-300" />
          <div className="flex items-center gap-2">
            <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>2</span>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Branding</span>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-300" />
          <div className="flex items-center gap-2">
            <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>3</span>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Branches</span>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 border border-red-200 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
            <Trash2 className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Wizard Card Body */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-md p-8">
          
          {/* STEP 1: BUSINESS PROFILE */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="border-b pb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  Tell us about your Business
                </h2>
                <p className="text-sm text-slate-500 mt-1">Provide core business details so we can configure your profile.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Business Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bella Salon & Spa"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Business Type</label>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="Salon">Salon & Beauty Clinic</option>
                    <option value="Restaurant">Restaurant & Cafe</option>
                    <option value="Hotel">Hotel & Resort</option>
                    <option value="Gym">Gym & Fitness Center</option>
                    <option value="Clinic">Medical & Dental Clinic</option>
                    <option value="Dealership">Car Dealership</option>
                    <option value="RealEstate">Real Estate Agency</option>
                    <option value="Other">Other Service Business</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      placeholder="contact@business.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Website URL</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="url"
                      placeholder="https://www.yourwebsite.com"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Corporate Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="123 Main Street, Suite 100, City, State"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <button
                  type="button"
                  disabled={!businessName}
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 py-2 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition disabled:opacity-50"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: BRAND CUSTOMIZATION */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="border-b pb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Palette className="h-5 w-5 text-blue-600" />
                  Custom Logo & Colors (White Label)
                </h2>
                <p className="text-sm text-slate-500 mt-1">Configure your review funnel style matches.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Logo Image URL</label>
                  <input
                    type="url"
                    placeholder="https://domain.com/logo.png"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <p className="text-[10px] text-slate-400">Provide an absolute URL pointing to your business logo file.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Primary Theme Color</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="h-10 w-12 cursor-pointer border rounded-lg bg-slate-50 border-slate-200"
                      />
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Secondary Accent Color</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="h-10 w-12 cursor-pointer border rounded-lg bg-slate-50 border-slate-200"
                      />
                      <input
                        type="text"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Funnel Preview mockup inside Step 2 */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-950">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-2">Live Funnel Header Preview</div>
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-2">
                      {logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoUrl} alt="Preview" className="h-6 w-auto" />
                      ) : (
                        <div className="h-6 w-6 rounded bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[8px] font-bold text-slate-400">LOGO</div>
                      )}
                      <span className="text-sm font-bold">{businessName || "Your Business Name"}</span>
                    </div>
                    <button
                      type="button"
                      style={{ backgroundColor: primaryColor }}
                      className="text-white text-[10px] font-semibold px-3 py-1 rounded"
                    >
                      Primary Button
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 py-2 px-4 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-semibold transition"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex items-center gap-2 py-2 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: BRANCHES & PUBLIC LINKS */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="border-b pb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  Branch Locations & Google Review Links
                </h2>
                <p className="text-sm text-slate-500 mt-1">Add locations and branches. Connect Google links for positive redirections.</p>
              </div>

              <div className="space-y-6">
                {branches.map((branch, index) => (
                  <div key={index} className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl relative bg-slate-50 dark:bg-slate-950 space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-300">Branch #{index + 1}</h3>
                      {branches.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveBranch(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase">Branch Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Downtown Branch"
                          value={branch.name}
                          onChange={(e) => handleBranchChange(index, "name", e.target.value)}
                          className="w-full px-3 py-1.5 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase">Branch Phone</label>
                        <input
                          type="tel"
                          placeholder="+1 (555) 000-0000"
                          value={branch.phone}
                          onChange={(e) => handleBranchChange(index, "phone", e.target.value)}
                          className="w-full px-3 py-1.5 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                        />
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase">Branch Address</label>
                        <input
                          type="text"
                          placeholder="Address of this specific branch"
                          value={branch.address}
                          onChange={(e) => handleBranchChange(index, "address", e.target.value)}
                          className="w-full px-3 py-1.5 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                        />
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase">Google Review URL</label>
                        <input
                          type="url"
                          placeholder="https://g.page/r/YOUR_BUSINESS_ID/review"
                          value={branch.google_review_url}
                          onChange={(e) => handleBranchChange(index, "google_review_url", e.target.value)}
                          className="w-full px-3 py-1.5 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddBranch}
                  className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-blue-300 hover:border-blue-500 text-blue-600 hover:text-blue-700 bg-blue-50/20 hover:bg-blue-50/50 rounded-lg text-sm font-semibold transition"
                >
                  <Plus className="h-4 w-4" />
                  Add Another Branch (Multi-Branch / Franchise Setup)
                </button>
              </div>

              <div className="flex justify-between pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 py-2 px-4 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-semibold transition"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleOnboardingSubmit}
                  className="flex items-center justify-center gap-2 py-2 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg text-sm transition disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Complete Onboarding
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
