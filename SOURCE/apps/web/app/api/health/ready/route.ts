import { NextResponse } from "next/server";
import { getPostgresPool } from "@/lib/postgres/pool";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const READY_TIMEOUT_MS = 3000;

export async function GET() {
  try {
    const pool = getPostgresPool();
    await Promise.race([
      pool.query("SELECT 1"),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("readiness check timed out")), READY_TIMEOUT_MS),
      ),
    ]);
    return NextResponse.json({ status: "ready" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { status: "not_ready", error: message },
      { status: 503 },
    );
  }
}
