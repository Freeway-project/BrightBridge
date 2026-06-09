import "server-only";

import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  Registry,
} from "prom-client";

type MetricsBag = {
  registry: Registry;
  httpRequestsTotal: Counter<string>;
  httpRequestDurationSeconds: Histogram<string>;
  oidcLoginStartedTotal: Counter<string>;
  oidcCallbackTotal: Counter<string>;
  devLoginTotal: Counter<string>;
  pgPoolConnections: Gauge<string>;
  pgQueryDurationSeconds: Histogram<string>;
  pgQueryErrorsTotal: Counter<string>;
  coursesTotal: Gauge<string>;
};

// Keep a single registry across HMR reloads in dev so counter values and
// metric registrations are not duplicated.
const globalForMetrics = globalThis as unknown as {
  __coursebridgeMetrics?: MetricsBag;
};

function buildMetrics(): MetricsBag {
  const registry = new Registry();
  collectDefaultMetrics({ register: registry });

  const httpRequestsTotal = new Counter({
    name: "http_requests_total",
    help: "Total HTTP requests handled by the Next.js app.",
    labelNames: ["method", "route", "status"],
    registers: [registry],
  });

  const httpRequestDurationSeconds = new Histogram({
    name: "http_request_duration_seconds",
    help: "HTTP request duration in seconds.",
    labelNames: ["method", "route", "status"],
    buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [registry],
  });

  const oidcLoginStartedTotal = new Counter({
    name: "oidc_login_started_total",
    help: "OIDC login flows initiated (redirect to IdP).",
    registers: [registry],
  });

  const oidcCallbackTotal = new Counter({
    name: "oidc_callback_total",
    help: "OIDC callbacks processed, labelled by outcome.",
    labelNames: ["result"],
    registers: [registry],
  });

  const devLoginTotal = new Counter({
    name: "dev_login_total",
    help: "Dev-only login attempts, labelled by outcome.",
    labelNames: ["result"],
    registers: [registry],
  });

  const pgPoolConnections = new Gauge({
    name: "pg_pool_connections",
    help: "Postgres pool connection counts by state.",
    labelNames: ["state"],
    registers: [registry],
  });

  const pgQueryDurationSeconds = new Histogram({
    name: "pg_query_duration_seconds",
    help: "Postgres query/connect duration in seconds.",
    labelNames: ["op"],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [registry],
  });

  const pgQueryErrorsTotal = new Counter({
    name: "pg_query_errors_total",
    help: "Postgres query errors.",
    registers: [registry],
  });

  const coursesTotal = new Gauge({
    name: "courses_total",
    help: "Total courses by status (refreshed on each /metrics scrape).",
    labelNames: ["status"],
    registers: [registry],
  });

  return {
    registry,
    httpRequestsTotal,
    httpRequestDurationSeconds,
    oidcLoginStartedTotal,
    oidcCallbackTotal,
    devLoginTotal,
    pgPoolConnections,
    pgQueryDurationSeconds,
    pgQueryErrorsTotal,
    coursesTotal,
  };
}

const metrics: MetricsBag =
  globalForMetrics.__coursebridgeMetrics ?? buildMetrics();
globalForMetrics.__coursebridgeMetrics = metrics;

export const metricsRegistry = metrics.registry;
export const httpRequestsTotal = metrics.httpRequestsTotal;
export const httpRequestDurationSeconds = metrics.httpRequestDurationSeconds;
export const oidcLoginStartedTotal = metrics.oidcLoginStartedTotal;
export const oidcCallbackTotal = metrics.oidcCallbackTotal;
export const devLoginTotal = metrics.devLoginTotal;
export const pgPoolConnections = metrics.pgPoolConnections;
export const pgQueryDurationSeconds = metrics.pgQueryDurationSeconds;
export const pgQueryErrorsTotal = metrics.pgQueryErrorsTotal;
export const coursesTotal = metrics.coursesTotal;

export function observeHttp(
  method: string,
  route: string,
  status: number,
  durationSeconds: number,
): void {
  const labels = { method, route, status: String(status) };
  httpRequestsTotal.inc(labels);
  httpRequestDurationSeconds.observe(labels, durationSeconds);
}
