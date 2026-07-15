import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { CircleHelp, Eye, EyeOff, MessageCircleQuestion } from "lucide-react"
import { BUCKET_META, BUCKET_ORDER } from "./bucket-badge"

/**
 * Explains what the staleness buckets and engagement terms mean, so the numbers
 * in the cards/table are self-describing. "Days since sent" always comes from
 * the course_status_events log, not courses.updated_at.
 */
export function HandoffLegend() {
  return (
    <Card className="border-border/60 bg-card/40 backdrop-blur-sm">
      <CardContent className="grid gap-x-6 gap-y-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {BUCKET_ORDER.map((bucket) => {
          const meta = BUCKET_META[bucket]
          return (
            <div key={bucket} className="flex items-start gap-2.5">
              <span className={cn("mt-1 size-2.5 shrink-0 rounded-full", meta.dot)} />
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground">
                  {meta.label}{" "}
                  <span className="font-medium text-muted-foreground">· {meta.range} since sent</span>
                </p>
                <p className="text-[11px] leading-snug text-muted-foreground">{meta.description}</p>
              </div>
            </div>
          )
        })}

        <LegendTerm icon={EyeOff} tone="text-slate-400" title="Never opened">
          No dashboard view recorded — the instructor hasn&rsquo;t looked at the course yet.
        </LegendTerm>
        <LegendTerm icon={Eye} tone="text-emerald-500" title="Opened">
          Instructor has opened the course at least once (with an open count when repeated).
        </LegendTerm>
        <LegendTerm icon={MessageCircleQuestion} tone="text-orange-500" title="Has questions">
          Instructor raised a question — the ball is back in your court to reply.
        </LegendTerm>
      </CardContent>
    </Card>
  )
}

function LegendTerm({
  icon: Icon,
  tone,
  title,
  children,
}: {
  icon: typeof CircleHelp
  tone: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className={cn("mt-0.5 size-3.5 shrink-0", tone)} />
      <div className="min-w-0">
        <p className="text-xs font-bold text-foreground">{title}</p>
        <p className="text-[11px] leading-snug text-muted-foreground">{children}</p>
      </div>
    </div>
  )
}
