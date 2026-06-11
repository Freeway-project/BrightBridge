import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { LatestMigrationReport } from "@/lib/migration/report"

type Props = {
  report: LatestMigrationReport | null
}

export function MigrationPanel({ report }: Props) {
  if (!report) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Migration</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No migration report found yet. Run:
          <pre className="mt-2 overflow-x-auto rounded-md border p-2 text-xs">{`node scripts/import-ta-form-migration.mjs "Gate 01 (QI) – TA Course Review Form (2)/Responses-Table 1.csv"`}</pre>
        </CardContent>
      </Card>
    )
  }

  const s = report.summary
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{report.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <strong>Environment:</strong> {report.environment} <br />
            <strong>Mode:</strong> {report.mode} <br />
            <strong>Started:</strong> {report.startedAt}
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Rows processed" value={String(s.totalRows ?? 0)} />
            <Stat label="Existing updated" value={String(s.updatedExisting ?? 0)} />
            <Stat label="New created" value={String(s.createdNew ?? 0)} />
            <Stat label="Staff assignments" value={String(s.staffAssignmentsAdded ?? 0)} tone={(s.staffAssignmentsAdded ?? 0) === 0 ? "warn" : "default"} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Normalization Applied</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Weak Course Code values were swapped to Course Title when safer.</p>
          <p>Invalid/unresolved term values were left blank.</p>
          <p>Missing URL protocol values were normalized to <code>https://</code> when domain-like.</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="outline">Code/Title swaps: {s.codeTitleSwaps ?? 0}</Badge>
            <Badge variant="outline">Blank terms: {s.blankTerms ?? 0}</Badge>
            <Badge variant="outline">URL auto-fixes: {s.urlAutoFixes ?? 0}</Badge>
            <Badge variant="outline">Problematic rows: {s.problematicRows ?? 0}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Open Problems</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {(report.problematicRows?.length ?? 0) === 0 ? (
            <p className="text-muted-foreground">No problematic rows in this run.</p>
          ) : (
            <ul className="list-disc pl-5 space-y-1">
              {report.problematicRows.slice(0, 80).map((row) => (
                <li key={`${row.row}-${row.courseRef}`}>
                  Row {row.row} ({row.courseRef}): {row.issues.join("; ")}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: string
  tone?: "default" | "warn"
}) {
  return (
    <div className={`rounded-lg border p-3 ${tone === "warn" ? "border-amber-300 bg-amber-50/60 dark:bg-amber-950/20" : ""}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  )
}
