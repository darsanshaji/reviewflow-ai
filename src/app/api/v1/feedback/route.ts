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

  const { data, error } = await supabaseAdmin
    .from("feedback")
    .select("id, rating, comments, category, sentiment, priority, created_at, branch_id, staff_id")
    .eq("tenant_id", tenantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
