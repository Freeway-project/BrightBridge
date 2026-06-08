import { NextRequest, NextResponse } from "next/server";
import { isDevLoginEnabled, mintDevSession } from "@/lib/auth/service";
import { getProfileRepository } from "@/lib/repositories";

export async function POST(request: NextRequest) {
  if (!isDevLoginEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const role = String(form.get("role") ?? "").trim();

  if (!email || !role) {
    return NextResponse.json({ error: "email and role are required" }, { status: 400 });
  }

  const profile = await getProfileRepository().getProfileByEmail(email);
  if (!profile) {
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

  return NextResponse.redirect(new URL("/dashboard", request.url));
}

export async function GET() {
  return new NextResponse("Use POST", { status: 405 });
}
