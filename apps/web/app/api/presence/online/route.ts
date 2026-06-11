import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { listOnlineUsers } from "@/lib/presence/store";

export async function GET() {
  const context = await getAuthContext();

  if (context.kind !== "profile") {
    return NextResponse.json({ users: [] }, { status: 401 });
  }

  return NextResponse.json({ users: listOnlineUsers() });
}
