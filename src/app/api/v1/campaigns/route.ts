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
    .from("campaigns")
    .select("id, name, type, status, schedule_time, template_body, created_at")
    .eq("tenant_id", tenantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const tenantId = getTenantId(req);
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, type, template_body, business_id } = body;

    if (!name || !type || !template_body || !business_id) {
      return NextResponse.json({ error: "Missing required parameters (name, type, template_body, business_id)" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("campaigns")
      .insert({
        tenant_id: tenantId,
        business_id,
        name,
        type,
        template_body,
        status: "Sent", // API dispatches are executed instantly
        schedule_time: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
