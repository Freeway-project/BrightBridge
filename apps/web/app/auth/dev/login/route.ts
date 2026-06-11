import { NextRequest, NextResponse } from "next/server";
import { isDevLoginEnabled, mintDevSession } from "@/lib/auth/service";
import { devLoginTotal } from "@/lib/observability/metrics";
import { getProfileRepository } from "@/lib/repositories";

function recordDevLogin(result: "success" | "failure"): void {
  try {
    devLoginTotal.inc({ result });
  } catch {
    // Metrics must not break auth.
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isDevLoginEnabled()) {
      recordDevLogin("failure");
      return new NextResponse("Not found", { status: 404 });
    }

    const form = await request.formData();
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const role = String(form.get("role") ?? "").trim();

    if (!email || !role) {
      recordDevLogin("failure");
      return NextResponse.json({ error: "email and role are required" }, { status: 400 });
    }

    const profile = await getProfileRepository().getProfileByEmail(email);
    if (!profile) {
      recordDevLogin("failure");
      return NextResponse.json(
        { error: `No profile found for ${email}. Seed it first (e.g. \`npm run dev:users\`).` },
        { status: 404 },
      );
    }

    await mintDevSession({
      sub: profile.id,
      email: profile.email,
      fullName: profile.fullName,
      role,
    });

    recordDevLogin("success");
    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (error) {
    recordDevLogin("failure");
    throw error;
  }
}

export async function GET() {
  return new NextResponse("Use POST", { status: 405 });
}
