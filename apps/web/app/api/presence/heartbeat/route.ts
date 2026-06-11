import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { heartbeatUser, removeUserPresence } from "@/lib/presence/store";

export async function POST() {
  const context = await getAuthContext();

  if (context.kind !== "profile") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  heartbeatUser({
    userId: context.userId,
    name: context.profile.fullName,
    email: context.email ?? "",
    role: context.profile.role,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest) {
  const context = await getAuthContext();

  if (context.kind !== "profile") {
    return NextResponse.json({ ok: true });
  }

  removeUserPresence(context.userId);
  return NextResponse.json({ ok: true });
}
