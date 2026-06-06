import Link from "next/link"
import { ChevronRight } from "lucide-react"
import type { OrgCrumb } from "@/lib/hierarchy/explorer-queries"

// Root → current trail. "Institution" is the always-present root that clears the
// `unit` param; each crumb links to that unit; the last (current) crumb is plain.
export function OrgBreadcrumb({ crumbs }: { crumbs: OrgCrumb[] }) {
  const items: { id: string | null; name: string }[] = [
    { id: null, name: "Institution" },
    ...crumbs.map((c) => ({ id: c.id, name: c.name })),
  ]

  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm">
      {items.map((it, i) => {
        const isLast = i === items.length - 1
        const href = it.id ? `/hierarchy?unit=${it.id}` : "/hierarchy"
        return (
          <span key={it.id ?? "__root"} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50" />}
            {isLast ? (
              <span aria-current="page" className="font-semibold text-foreground">{it.name}</span>
            ) : (
              <Link href={href} className="text-muted-foreground hover:text-foreground hover:underline">
                {it.name}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
