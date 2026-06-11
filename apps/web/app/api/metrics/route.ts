import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  coursesTotal,
  metricsRegistry,
  pgPoolConnections,
} from "@/lib/observability/metrics";
import { getPostgresPool } from "@/lib/postgres/pool";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function tokensMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // timingSafeEqual requires equal-length buffers; bail early otherwise.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function refreshPoolGauges(): Promise<void> {
  try {
    const pool = getPostgresPool();
    pgPoolConnections.set({ state: "total" }, pool.totalCount);
    pgPoolConnections.set({ state: "idle" }, pool.idleCount);
    pgPoolConnections.set({ state: "waiting" }, pool.waitingCount);
  } catch {
    // Pool may not be initialised yet; metrics scrape must not fail.
  }
}

async function refreshCoursesGauge(): Promise<void> {
  try {
    const pool = getPostgresPool();
    const result = await pool.query<{ status: string | null; count: string }>(
      "SELECT status, COUNT(*)::text AS count FROM courses GROUP BY status",
    );
    coursesTotal.reset();
    for (const row of result.rows) {
      coursesTotal.set(
        { status: row.status ?? "unknown" },
        Number(row.count) || 0,
      );
    }
  } catch {
    // Swallow so the scrape always returns the rest of the metrics.
  }
}

export async function GET(request: NextRequest) {
  const expected = process.env.METRICS_BEARER_TOKEN?.trim();
  if (!expected) {
    return new NextResponse("metrics token not configured", { status: 503 });
  }

  const header = request.headers.get("authorization") ?? "";
  const prefix = "Bearer ";
  if (!header.startsWith(prefix)) {
    return new NextResponse("unauthorized", { status: 401 });
  }
  const provided = header.slice(prefix.length).trim();
  // Constant-time compare to prevent token timing attacks.
  if (!tokensMatch(provided, expected)) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  await refreshPoolGauges();
  await refreshCoursesGauge();

  const body = await metricsRegistry.metrics();
  return new NextResponse(body, {
    status: 200,
    headers: { "content-type": metricsRegistry.contentType },
  });
}
