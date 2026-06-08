"use client";

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  Star, ChevronRight, Upload, AlertCircle, 
  CheckCircle, ArrowRight, Copy, Check 
} from "lucide-react";

type FunnelState = "rating" | "low_feedback" | "high_thankyou" | "submitted";

interface BranchData {
  id: string;
  name: string;
  google_review_url: string;
  tenant_id: string;
  businesses: {
    name: string;
    logo_url: string;
    brand_colors: {
      primary: string;
      secondary: string;
    };
  };
}

export default function ReviewFunnelPage() {
  const { branchId } = useParams();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [branch, setBranch] = useState<BranchData | null>(null);

  // Styling Tokens (Loaded dynamically from white-label settings)
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [secondaryColor, setSecondaryColor] = useState("#475569");
  const [logoUrl, setLogoUrl] = useState("");

  // Funnel Flow State
  const [funnelState, setFunnelState] = useState<FunnelState>("rating");
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

  // Form inputs (Low Rating Flow)
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [serviceUsed, setServiceUsed] = useState("");
  const [staffMember, setStaffMember] = useState("");
  const [comments, setComments] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Lists for dropdown pre-fills
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([]);
  const [servicesList, setServicesList] = useState<{ id: string; name: string }[]>([]);

  // Geolocation coordinates
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  // Disappointment checkmarks
  const [complaintCategories, setComplaintCategories] = useState({
    waiting_time: false,
    staff_behavior: false,
    service_quality: false,
    pricing: false,
    cleanliness: false,
    other: false,
  });

  // AI Review Writer
  const [aiKeywords, setAiKeywords] = useState("");
  const [generatedReview, setGeneratedReview] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // 1. Log Funnel Start Time in Session Storage
    if (!sessionStorage.getItem("funnel_start_time")) {
      sessionStorage.setItem("funnel_start_time", new Date().getTime().toString());
    }

    // 2. Request Geolocation coordinates if permitted
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        () => {
          // Ignore location block
        }
      );
    }

    async function fetchBranchAndContext() {
      if (!branchId) return;

      try {
        const { data, error } = await supabase
          .from("branches")
          .select(`
            id,
            name,
            google_review_url,
            tenant_id,
            businesses (
              name,
              logo_url,
              brand_colors
            )
          `)
          .eq("id", branchId)
          .single();

        if (error) throw error;
        if (data) {
          const bizData = data.businesses as any;
          setBranch(data as any);
          if (bizData?.brand_colors?.primary) setPrimaryColor(bizData.brand_colors.primary);
          if (bizData?.brand_colors?.secondary) setSecondaryColor(bizData.brand_colors.secondary);
          if (bizData?.logo_url) setLogoUrl(bizData.logo_url);

          // Fetch Staff list for dropdown
          const { data: staffData } = await supabase
            .from("staff")
            .select("id, name")
            .eq("tenant_id", data.tenant_id);
          if (staffData) setStaffList(staffData);

          // Fetch Services list for dropdown
          const { data: servicesData } = await supabase
            .from("services")
            .select("id, name")
            .eq("tenant_id", data.tenant_id);
          if (servicesData) setServicesList(servicesData);

          // Pre-fill staff from search queries if passed
          const staffQueryId = searchParams.get("staff");
          if (staffQueryId && staffData) {
            const foundStaff = staffData.find((s) => s.id === staffQueryId);
            if (foundStaff) setStaffMember(foundStaff.id);
          }

          // Pre-fill service from search queries if passed
          const serviceQueryId = searchParams.get("service");
          if (serviceQueryId && servicesData) {
            const foundService = servicesData.find((s) => s.id === serviceQueryId);
            if (foundService) setServiceUsed(foundService.id);
          }

          // Log Page Open Analytics event
          await supabase.from("analytics_events").insert({
            tenant_id: data.tenant_id,
            event_type: "page_open",
            metadata: { 
              branch_id: branchId, 
              device: navigator.userAgent,
              qr_code_id: searchParams.get("qr") || null,
              location: coords
            }
          });
        }
      } catch (err: any) {
        setErrorMsg("Could not find this business review page.");
      } finally {
        setLoading(false);
      }
    }
    fetchBranchAndContext();
  }, [branchId, supabase, searchParams, coords]);

  const handleRatingSelect = async (rating: number) => {
    setSelectedRating(rating);
    if (!branch) return;

    // Log rating selection analytics event
    await supabase.from("analytics_events").insert({
      tenant_id: branch.tenant_id,
      event_type: "rating_selected",
      metadata: { 
        branch_id: branchId, 
        rating,
        qr_code_id: searchParams.get("qr") || null
      }
    });

    if (rating <= 3) {
      setFunnelState("low_feedback");
    } else {
      // Generate default AI review text right away
      setGeneratedReview(`I had an outstanding experience at ${branch.businesses.name}! The services were professional, the environment was pristine, and the team exceeded all expectations. Highly recommended!`);
      setFunnelState("high_thankyou");
    }
  };

  const handleCheckboxChange = (category: keyof typeof complaintCategories) => {
    setComplaintCategories({
      ...complaintCategories,
      [category]: !complaintCategories[category],
    });
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branch || selectedRating === null) return;

    setSubmittingFeedback(true);
    try {
      // Find or create customer
      let customerId: string | null = null;
      if (customerEmail || customerName) {
        const { data: customer } = await supabase
          .from("customers")
          .insert({
            tenant_id: branch.tenant_id,
            name: customerName || "Anonymous Customer",
            phone: customerPhone,
            email: customerEmail,
          })
          .select()
          .single();
        if (customer) customerId = customer.id;
      }

      // Map disappointment reasons
      const selectedReasons = Object.keys(complaintCategories)
        .filter((k) => complaintCategories[k as keyof typeof complaintCategories])
        .join(", ");

      // Calculate Completion Time
      const startTimeStr = sessionStorage.getItem("funnel_start_time");
      let completionTimeSec = null;
      if (startTimeStr) {
        const startTime = parseInt(startTimeStr, 10);
        completionTimeSec = Math.round((new Date().getTime() - startTime) / 1000);
      }

      // Insert feedback
      const { error } = await supabase.from("feedback").insert({
        tenant_id: branch.tenant_id,
        branch_id: branch.id,
        customer_id: customerId,
        staff_id: staffMember || null,
        service_id: serviceUsed || null,
        rating: selectedRating,
        comments: comments,
        category: selectedReasons || "General Feedback",
      });

      if (error) throw error;

      // Log feedback submission event
      await supabase.from("analytics_events").insert({
        tenant_id: branch.tenant_id,
        event_type: "feedback_submitted",
        metadata: { 
          branch_id: branch.id, 
          rating: selectedRating,
          qr_code_id: searchParams.get("qr") || null,
          completion_time_seconds: completionTimeSec,
          location: coords
        }
      });

      setFunnelState("submitted");
    } catch (err) {
      alert("Failed to submit feedback. Please try again.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const generateCustomAIReview = () => {
    if (!branch) return;
    const keywords = aiKeywords.trim() || "friendly service";
    setGeneratedReview(
      `I recently visited ${branch.businesses.name} and was thoroughly impressed. Especially loved the ${keywords}. The staff was welcoming, and the service was absolutely perfect. Will definitely return!`
    );
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedReview);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGoogleRedirect = async () => {
    if (!branch) return;
    
    // Log redirect click event
    await supabase.from("analytics_events").insert({
      tenant_id: branch.tenant_id,
      event_type: "review_click",
      metadata: { 
        branch_id: branch.id, 
        rating: selectedRating,
        qr_code_id: searchParams.get("qr") || null
      }
    });

    window.open(branch.google_review_url || "https://google.com", "_blank");
    setFunnelState("submitted");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <span className="text-sm font-semibold text-slate-500">Loading experience...</span>
        </div>
      </div>
    );
  }

  if (errorMsg || !branch) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center shadow-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Feedback Page Offline</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            The link you are trying to reach is invalid or the business has not completed their setup yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      
      {/* Brand Header */}
      <header className="h-16 px-4 border-b bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-sm">
        <div className="flex items-center gap-2">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Logo" className="h-8 w-auto object-contain" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
              {branch.businesses.name.charAt(0)}
            </div>
          )}
          <span className="font-bold text-lg">{branch.businesses.name}</span>
        </div>
      </header>

      {/* Main Form Area */}
      <main className="flex-1 flex items-center justify-center py-10 px-4">
        <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-lg">

          {/* STEP 1: EMOJI RATING LANDING */}
          {funnelState === "rating" && (
            <div className="space-y-8 text-center">
              <div className="space-y-2">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">How was your experience today?</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">Your feedback helps us provide better service.</p>
              </div>

              {/* Emoji Card Grid */}
              <div className="grid grid-cols-5 gap-2 sm:gap-4 justify-center">
                {[
                  { rating: 1, emoji: "😡", text: "Poor" },
                  { rating: 2, emoji: "🙁", text: "Fair" },
                  { rating: 3, emoji: "🙂", text: "Good" },
                  { rating: 4, emoji: "😊", text: "Great" },
                  { rating: 5, emoji: "😍", text: "Outstanding" },
                ].map((item) => (
                  <button
                    key={item.rating}
                    onClick={() => handleRatingSelect(item.rating)}
                    className="flex flex-col items-center p-2 sm:p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-500 hover:bg-blue-50/10 dark:hover:bg-blue-950/20 hover:scale-105 active:scale-95 transition-all"
                  >
                    <span className="text-3xl sm:text-4xl">{item.emoji}</span>
                    <span className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 mt-2">{item.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: LOW RATING FLOW (1-3 STARS) */}
          {funnelState === "low_feedback" && (
            <form onSubmit={handleFeedbackSubmit} className="space-y-5">
              <div className="border-b pb-3 text-center sm:text-left">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">We appreciate your feedback</h2>
                <p className="text-xs text-slate-500 mt-1">What disappointed you today? We would love to make this right.</p>
              </div>

              {/* Disappointment Checkboxes */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Select Disappointment Area</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "waiting_time", label: "Waiting Time" },
                    { key: "staff_behavior", label: "Staff Behavior" },
                    { key: "service_quality", label: "Service Quality" },
                    { key: "pricing", label: "Pricing" },
                    { key: "cleanliness", label: "Cleanliness" },
                    { key: "other", label: "Other" },
                  ].map((cat) => (
                    <label
                      key={cat.key}
                      className="flex items-center gap-2 p-2 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-950 cursor-pointer text-xs transition"
                    >
                      <input
                        type="checkbox"
                        checked={complaintCategories[cat.key as keyof typeof complaintCategories]}
                        onChange={() => handleCheckboxChange(cat.key as keyof typeof complaintCategories)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>{cat.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Customer Info */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Your Name</label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Your Phone</label>
                  <input
                    type="tel"
                    placeholder="Phone number"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Your Email</label>
                  <input
                    type="email"
                    placeholder="you@domain.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                </div>
              </div>

              {/* Dropdowns for pre-fills (Staff / Service) */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Service Used</label>
                  <select
                    value={serviceUsed}
                    onChange={(e) => setServiceUsed(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:outline-none text-xs"
                  >
                    <option value="">-- Select Service --</option>
                    {servicesList.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Staff Member</label>
                  <select
                    value={staffMember}
                    onChange={(e) => setStaffMember(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:outline-none text-xs"
                  >
                    <option value="">-- Select Staff --</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Comments & Image upload */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Describe your experience</label>
                  <textarea
                    rows={3}
                    placeholder="Tell us more about what went wrong..."
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Upload Evidence (Optional)</label>
                  <label className="flex flex-col items-center justify-center p-3 border border-dashed rounded-lg bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer transition">
                    <Upload className="h-5 w-5 text-slate-400 mb-1" />
                    <span className="text-[10px] text-slate-500">
                      {photoFile ? photoFile.name : "Select photo to upload"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end pt-3 border-t">
                <button
                  type="submit"
                  disabled={submittingFeedback}
                  style={{ backgroundColor: primaryColor }}
                  className="flex items-center gap-2 py-2 px-6 text-white font-semibold rounded-lg text-xs transition disabled:opacity-50"
                >
                  {submittingFeedback ? "Submitting..." : "Submit Private Feedback"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: HIGH RATING FLOW (4-5 STARS) */}
          {funnelState === "high_thankyou" && (
            <div className="space-y-6 text-center">
              <div className="space-y-2">
                <div className="text-4xl">🎉</div>
                <h2 className="text-lg font-bold">Thank you for your review!</h2>
                <p className="text-xs text-slate-500">We would love it if you shared your experience publicly on Google.</p>
              </div>

              {/* AI Review Writer Card */}
              <div className="p-4 border rounded-xl bg-slate-50 dark:bg-slate-950 text-left space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Review Assistant</span>
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 transition"
                  >
                    {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>

                <textarea
                  readOnly
                  value={generatedReview}
                  className="w-full p-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 resize-none focus:outline-none"
                  rows={4}
                />

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter keywords (e.g. prompt service)"
                    value={aiKeywords}
                    onChange={(e) => setAiKeywords(e.target.value)}
                    className="flex-1 px-3 py-1.5 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs focus:outline-none"
                  />
                  <button
                    onClick={generateCustomAIReview}
                    style={{ backgroundColor: primaryColor }}
                    className="text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                  >
                    Re-Write
                  </button>
                </div>
              </div>

              {/* Redirect Action */}
              <div className="space-y-2">
                <button
                  onClick={handleGoogleRedirect}
                  style={{ backgroundColor: primaryColor }}
                  className="w-full flex items-center justify-center gap-2 py-3 text-white font-bold rounded-lg text-sm shadow transition"
                >
                  <span>Leave a Review on Google</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <p className="text-[10px] text-slate-400">Clicking redirect saves your click completion metric to our platform analytics.</p>
              </div>
            </div>
          )}

          {/* SUBMITTED SUCCESS FLOW */}
          {funnelState === "submitted" && (
            <div className="py-8 text-center space-y-4">
              <CheckCircle className="h-14 w-14 text-green-500 mx-auto" />
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Thank You!</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Your feedback has been successfully processed. We appreciate your assistance in helping us grow.
                </p>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <span className="text-[10px] text-slate-400 uppercase tracking-widest">Powered by ReviewFlow AI</span>
      </footer>
    </div>
  );
}
