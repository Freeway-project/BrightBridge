import Link from "next/link"
import { ArrowRight, Building2, FolderTree } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// Front-and-centre entry points for the provost. Big, obviously-clickable cards
// so a non-technical user can find the two things that matter — exploring the
// institution and managing its structure — without hunting through the nav.
const ITEMS = [
  {
    href: "/hierarchy",
    title: "Explore the Hierarchy",
    desc: "Drill into every school and department to see its courses, leadership, and progress.",
    icon: FolderTree,
    primary: true,
  },
  {
    href: "/provost/org",
    title: "Manage Organization",
    desc: "Create schools and departments, and assign deans and department heads.",
    icon: Building2,
    primary: false,
  },
] as const

export function ProvostExplore() {
  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Explore your institution
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {ITEMS.map((it) => {
          const Icon = it.icon
          return (
            <Link
              key={it.href}
              href={it.href}
              className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Card
                className={cn(
                  "h-full p-5 transition-all group-hover:-translate-y-0.5 group-hover:shadow-md",
                  it.primary
                    ? "border-primary/40 bg-primary/5 group-hover:border-primary/60"
                    : "group-hover:border-primary/40",
                )}
              >
                <div className="flex items-start gap-4">
                  <span
                    className={cn(
                      "shrink-0 rounded-lg p-2.5",
                      it.primary ? "bg-primary/15 text-primary" : "bg-muted text-foreground/70",
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold group-hover:text-primary">{it.title}</h3>
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{it.desc}</p>
                  </div>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
