import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { metricsRegistry, pgPoolConnections, coursesTotal } from "@/lib/observability/metrics";
import { getPostgresPool } from "@/lib/postgres/pool";
import { recentLogs } from "@/lib/observability/log-buffer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type MetricJSON = {
  name: string;
  values: Array<{ value: number; labels: Record<string, string> }>;
};

function findMetric(metrics: MetricJSON[], name: string): MetricJSON | undefined {
  return metrics.find((m) => m.name === name);
}

function sumValues(metric: MetricJSON | undefined, predicate?: (labels: Record<string, string>) => boolean): number {
  if (!metric) return 0;
  return metric.values.reduce((acc, v) => {
    if (predicate && !predicate(v.labels)) return acc;
    return acc + (Number.isFinite(v.value) ? v.value : 0);
  }, 0);
}

function labeledMap(metric: MetricJSON | undefined, key: string): Record<string, number> {
  const out: Record<string, number> = {};
  if (!metric) return out;
  for (const v of metric.values) {
    const k = v.labels[key];
    if (!k) continue;
    out[k] = (out[k] ?? 0) + v.value;
  }
  return out;
}

async function refreshGauges(): Promise<void> {
  try {
    const pool = getPostgresPool();
    pgPoolConnections.set({ state: "total" }, pool.totalCount);
    pgPoolConnections.set({ state: "idle" }, pool.idleCount);
    pgPoolConnections.set({ state: "waiting" }, pool.waitingCount);

    const result = await pool.query<{ status: string | null; count: string }>(
      "SELECT status, COUNT(*)::text AS count FROM courses GROUP BY status",
    );
    coursesTotal.reset();
    for (const row of result.rows) {
      coursesTotal.set({ status: row.status ?? "unknown" }, Number(row.count) || 0);
    }
  } catch {
    // best-effort
  }
}

export async function GET() {
  const context = await getAuthContext();
  if (context.kind !== "profile" || context.profile.role !== "super_admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await refreshGauges();
  const metrics = (await metricsRegistry.getMetricsAsJSON()) as unknown as MetricJSON[];

  const memBytes = sumValues(findMetric(metrics, "process_resident_memory_bytes"));
  const cpuUserSec = sumValues(findMetric(metrics, "process_cpu_user_seconds_total"));
  const cpuSysSec = sumValues(findMetric(metrics, "process_cpu_system_seconds_total"));
  const uptimeSec = sumValues(findMetric(metrics, "process_start_time_seconds"));
  const startEpoch = uptimeSec || 0;

  const httpTotal = sumValues(findMetric(metrics, "http_requests_total"));
  const httpErrors = sumValues(findMetric(metrics, "http_requests_total"), (l) => {
    const code = Number(l.status);
    return code >= 500;
  });

  const pool = labeledMap(findMetric(metrics, "pg_pool_connections"), "state");
  const courses = labeledMap(findMetric(metrics, "courses_total"), "status");

  const oidcOutcomes = labeledMap(findMetric(metrics, "oidc_callback_total"), "result");

  return NextResponse.json({
    snapshotTs: Date.now(),
    process: {
      memoryRssBytes: memBytes,
      cpuSeconds: cpuUserSec + cpuSysSec,
      startEpochSec: startEpoch,
    },
    http: {
      requestsTotal: httpTotal,
      errorsTotal: httpErrors,
    },
    db: {
      poolTotal: pool.total ?? 0,
      poolIdle: pool.idle ?? 0,
      poolWaiting: pool.waiting ?? 0,
    },
    courses,
    auth: { oidcOutcomes },
    recentLogs: recentLogs(100),
  });
}
