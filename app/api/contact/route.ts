import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`contact:${ip}`, 5, 60_000)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }
  try {
    const body = await req.json();
    const payload = {
      name: String(body.name ?? "").slice(0, 120),
      email: String(body.email ?? "").slice(0, 200),
      org: String(body.org ?? "").slice(0, 200),
      message: String(body.message ?? "").slice(0, 4000),
      receivedAt: new Date().toISOString(),
    };
    if (!payload.name || !payload.email || !payload.message) {
      return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
    }
    console.info("[contact]", payload);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
}
