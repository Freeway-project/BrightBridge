import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function MigrationPanel() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Migration Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            This tab tracks the TA-form migration run done on <strong>May 8, 2026 (UTC)</strong> in the
            <strong> dev environment</strong>.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Rows processed" value="95" />
            <Stat label="Existing courses updated" value="37" />
            <Stat label="New courses created" value="58" />
            <Stat label="Staff assignments added" value="0" tone="warn" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What Was Applied</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Weak Course Code values were swapped to Course Title when needed.</p>
          <p>Unclear term values were left blank instead of forcing invalid values.</p>
          <p>URLs with missing protocol were normalized to <code>https://</code> when safe.</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="outline">Code/Title swaps: 24</Badge>
            <Badge variant="outline">Blank terms: 4</Badge>
            <Badge variant="outline">URL auto-fixes: 5 cells</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Open Issues</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            TA mapping did not attach to existing staff profiles in this run, so assignment inserts were zero.
          </p>
          <p>
            Problematic row groups:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Invalid/placeholder URLs: rows 16, 29, 30, 73</li>
            <li>Blank/invalid term rows: 11, 35, 40, 69</li>
            <li>Code/title confusion rows: 9, 12, 14, 29, 30, 34, 35, 36, 37, 38, 39, 40, 46, 54, 55, 57, 58, 60, 67, 71, 73, 76, 90, 95</li>
            <li>Mixed link+notes cells: 13, 16, 18, 23, 24, 25, 28, 29, 30, 42, 49, 64, 80, 82</li>
          </ul>
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

