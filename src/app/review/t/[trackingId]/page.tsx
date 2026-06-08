import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

interface PageProps {
  params: {
    trackingId: string;
  };
}

export default async function TrackingRedirectPage({ params }: PageProps) {
  const { trackingId } = params;
  const supabase = createClient();

  // 1. Resolve tracking ID in public.qr_codes
  const { data: qrConfig, error } = await supabase
    .from("qr_codes")
    .select("tenant_id, branch_id, staff_id, service_id, target_type, target_id")
    .eq("id", trackingId)
    .single();

  if (error || !qrConfig) {
    // If not found, redirect to general error page
    redirect("/login?error=Invalid tracking link");
  }

  // 2. Parse device and browser details from HTTP headers
  const headersList = headers();
  const userAgent = headersList.get("user-agent") || "Unknown Device";
  const ipAddress = headersList.get("x-forwarded-for") || "127.0.0.1";

  // 3. Log the "page_open" & "qr_scan" analytics events
  await supabase.from("analytics_events").insert({
    tenant_id: qrConfig.tenant_id,
    event_type: "qr_scan",
    metadata: {
      qr_code_id: trackingId,
      branch_id: qrConfig.branch_id,
      staff_id: qrConfig.staff_id,
      service_id: qrConfig.service_id,
      target_type: qrConfig.target_type,
      target_id: qrConfig.target_id,
      device: userAgent,
      ip: ipAddress,
      open_time: new Date().toISOString(),
    },
  });

  // 4. Construct review funnel path with search queries to pre-fill funnel
  const funnelUrl = new URL(`/review/${qrConfig.branch_id}`, "http://localhost:3000"); // Origin is handled relative in redirect
  
  const queryParams = new URLSearchParams();
  queryParams.set("qr", trackingId);
  if (qrConfig.staff_id) queryParams.set("staff", qrConfig.staff_id);
  if (qrConfig.service_id) queryParams.set("service", qrConfig.service_id);
  if (qrConfig.target_type === "Table" || qrConfig.target_type === "Chair") {
    queryParams.set("target_type", qrConfig.target_type);
    queryParams.set("target_id", qrConfig.target_id);
  }

  // Redirect to the dynamic review funnel
  redirect(`/review/${qrConfig.branch_id}?${queryParams.toString()}`);
}
