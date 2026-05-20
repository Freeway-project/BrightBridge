import { readFileSync } from "node:fs"
import { join } from "node:path"

let cachedVersion: string | null = null

export function getDeploymentVersion(): string {
  if (cachedVersion) return cachedVersion

  const envVersion =
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ??
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
