import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isRateLimited } from "@/lib/security/rateLimiter";
import { sanitizeInput } from "@/lib/security/sanitize";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getTenantId(req: Request) {
  const apiKey = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace("Bearer ", "");
  if (!apiKey) return null;
  return apiKey;
}

export async function GET(req: Request) {
  // 1. Rate Limiting Check
  const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
  const limiter = isRateLimited(ipAddress);
  if (limiter.limited) {
    return NextResponse.json(
      { error: `Too many requests. Rate limit reset in ${limiter.reset}s.` },
      { status: 429, headers: { "Retry-After": limiter.reset.toString() } }
    );
  }

  // 2. Authentication Check
  const tenantId = getTenantId(req);
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthorized. Missing or invalid API Key." }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("customers")
    .select("id, name, phone, email, created_at")
    .eq("tenant_id", tenantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  // 1. Rate Limiting Check
  const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
  const limiter = isRateLimited(ipAddress);
  if (limiter.limited) {
    return NextResponse.json(
      { error: `Too many requests. Rate limit reset in ${limiter.reset}s.` },
      { status: 429 }
    );
  }

  // 2. Authentication Check
  const tenantId = getTenantId(req);
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, email, phone } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // 3. XSS Input Sanitization
    const cleanName = sanitizeInput(name);
    const cleanEmail = sanitizeInput(email || "");
    const cleanPhone = sanitizeInput(phone || "");

    const { data, error } = await supabaseAdmin
      .from("customers")
      .insert({
        tenant_id: tenantId,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
