export const SYSTEM_MIGRATION_CONFIG = {
  // Domain that should stop serving the app after the migration starts
  OLD_DOMAIN_HOST: "lms.harshsaw.me",

  // Notification banner appears after this date
  BANNER_START_DATE: new Date("2026-05-14T10:00:00Z"),
  
  // Old domain handoff starts. 20:30 UTC is 1:30 PM Pacific on May 14, 2026.
  MIGRATION_START_DATE: new Date("2026-05-14T20:30:00Z"),

  // New domain URL
  NEW_DOMAIN_URL: process.env.NEXT_PUBLIC_NEW_DOMAIN_URL ?? "https://brightbridge.oracle.example.com",
  
  // Informational links or reasons
  REASON: "This domain has moved to the new CourseBridge home.",
  
  // Manual override (can be set via env var)
  IS_FORCE_MAINTENANCE: process.env.NEXT_PUBLIC_FORCE_MAINTENANCE === "true",
};

export type MigrationStatus = "NORMAL" | "ANNOUNCED" | "ACTIVE";

function normalizeHostname(hostname?: string | null): string {
  return (hostname ?? "").split(":")[0]?.toLowerCase() ?? "";
}

function isLocalPreviewHost(hostname?: string | null): boolean {
  const normalized = normalizeHostname(hostname);
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "0.0.0.0";
}

export function isOldMigrationDomain(hostname?: string | null): boolean {
  return normalizeHostname(hostname) === SYSTEM_MIGRATION_CONFIG.OLD_DOMAIN_HOST.toLowerCase();
}

export function getSystemMigrationStatus(hostname?: string | null): MigrationStatus {
  if (SYSTEM_MIGRATION_CONFIG.IS_FORCE_MAINTENANCE) return "ACTIVE";

  if (process.env.NODE_ENV !== "production" && isLocalPreviewHost(hostname)) {
    return "ANNOUNCED";
  }

  if (!isOldMigrationDomain(hostname)) return "NORMAL";
  
  const now = new Date();
  if (now >= SYSTEM_MIGRATION_CONFIG.MIGRATION_START_DATE) {
    return "ACTIVE";
  }
  if (now >= SYSTEM_MIGRATION_CONFIG.BANNER_START_DATE) {
    return "ANNOUNCED";
  }
  return "NORMAL";
}

export function isReadonlyMode(hostname?: string | null): boolean {
  return getSystemMigrationStatus(hostname) === "ACTIVE";
}
