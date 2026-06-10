import "server-only"

import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

export type LatestMigrationReport = {
  title: string
  startedAt: string
  finishedAt: string
  mode: string
  environment: string
  csvPath: string
  adminActorEmail: string
  summary: {
    totalRows: number
    codeTitleSwaps: number
    blankTerms: number
    urlAutoFixes: number
    problematicRows: number
    updatedExisting: number
    createdNew: number
    staffAssignmentsAdded: number
    reviewResponsesUpserted: number
    statusEventsInserted: number
    rowsFailed: number
  }
  notes: string[]
  problematicRows: Array<{
    row: number
    courseRef: string
    reviewer: string
    issues: string[]
    urlAutoFixes: Array<{ field: string; from: string; to: string }>
  }>
  involvedCourses: Array<{
    row: number
    courseRef: string
    reviewer: string
    taEmail: string
    term: string | null
  }>
}

const REPORT_PATH = path.join(process.cwd(), "docs", "migration-runs", "latest-ta-migration.json")

export async function getLatestMigrationReport(): Promise<LatestMigrationReport | null> {
  if (!existsSync(REPORT_PATH)) return null
  try {
    const parsed = JSON.parse(readFileSync(REPORT_PATH, "utf8"))
    return parsed as LatestMigrationReport
  } catch {
    return null
  }
}
