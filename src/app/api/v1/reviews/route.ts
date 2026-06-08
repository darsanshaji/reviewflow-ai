import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getTenantId(req: Request) {
  return req.headers.get("x-api-key") || req.headers.get("authorization")?.replace("Bearer ", "");
}

export async function GET(req: Request) {
  const tenantId = getTenantId(req);
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Filter analytics events by review click
  const { data, error } = await supabaseAdmin
    .from("analytics_events")
    .select("id, metadata, created_at")
    .eq("tenant_id", tenantId)
    .eq("event_type", "review_click");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ 
    total_reviews_generated: data?.length || 0,
    clicks: data 
  });
}
