import { readFileSync } from "node:fs"
import { join } from "node:path"

let cachedVersion: string | null = null

/** Absolute path to the deploy marker file written by scripts/deploy.sh. */
export function getVersionFilePath(): string {
  return join(process.cwd(), ".deployment-version")
}

/** Read the deploy marker fresh (no caching). Returns null if absent/unreadable. */
export function readVersionFile(): string | null {
  try {
    const v = readFileSync(getVersionFilePath(), "utf8").trim()
    return v || null
  } catch {
    return null
  }
}

/**
 * The version this server process is running. Resolution order:
 *   1. deploy marker file (.deployment-version, written at deploy time)
 *   2. env (GIT_COMMIT_SHA / NEXT_PUBLIC_GIT_COMMIT_SHA / NEXT_PUBLIC_APP_VERSION)
 *   3. .next/BUILD_ID
 *   4. "development"
 * Memoized — a process's own version never changes during its lifetime. The SSE
 * stream reads the marker fresh via readVersionFile() to detect a new deploy.
 */
export function getDeploymentVersion(): string {
  if (cachedVersion) return cachedVersion

  const fileVersion = readVersionFile()
  if (fileVersion) {
    cachedVersion = fileVersion
    return cachedVersion
  }

  const envVersion =
    process.env.GIT_COMMIT_SHA ??
    process.env.NEXT_PUBLIC_GIT_COMMIT_SHA ??
    process.env.NEXT_PUBLIC_APP_VERSION

  if (envVersion) {
    cachedVersion = envVersion
    return cachedVersion
  }

  try {
    cachedVersion = readFileSync(join(process.cwd(), ".next", "BUILD_ID"), "utf8").trim()
  } catch {
    cachedVersion = "development"
  }

  return cachedVersion
}
