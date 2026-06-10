import { redirect } from "next/navigation"
import { COURSE_STATUSES, type CourseStatus } from "@coursebridge/workflow"
import { Topbar } from "@/components/layout/topbar"
import { getAuthContext } from "@/lib/auth/context"
import { getOrgExplorerCourses, getOrgExplorerView } from "@/lib/hierarchy/explorer-queries"
import { OrgExplorer } from "@/components/hierarchy/org-explorer"

// Institution drill-down explorer, surfaced as its own sidebar route for everyone
// with cross-unit oversight (admin, provost, super-admin). Navigate one level at a
// time (College → School → Department); landing on a unit shows KPIs, leadership,
// and a searchable/filterable/paginated table of the unit's courses. URL-driven so
// drill-down/filters/pagination are shareable; access is gated here and again in
// the server queries (requireOrgViewer).

type SearchParams = Record<string, string | string[] | undefined>

interface Props {
  searchParams?: Promise<SearchParams> | SearchParams
}

const PAGE_SIZE = 20

function str(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : ""
}

export default async function HierarchyPage({ searchParams }: Props) {
  const context = await getAuthContext()

  if (
    context.kind !== "profile" ||
    (context.profile.role !== "admin_full" &&
      context.profile.role !== "provost" &&
      context.profile.role !== "super_admin")
  ) {
    redirect("/dashboard")
  }

  const sp = searchParams instanceof Promise ? await searchParams : searchParams
  const unit = str(sp?.unit) || null
  const search = str(sp?.search)
  const statusParam = str(sp?.status)
  const status = (COURSE_STATUSES as readonly string[]).includes(statusParam)
    ? (statusParam as CourseStatus)
    : undefined
  const term = str(sp?.term)
  const page = Math.max(1, Number(str(sp?.page) || "1") || 1)

  const [view, courses] = await Promise.all([
    getOrgExplorerView(unit),
    unit
      ? getOrgExplorerCourses(unit, {
          page,
          pageSize: PAGE_SIZE,
          search: search || undefined,
          status,
          term: term || undefined,
        })
      : Promise.resolve(null),
  ])

  return (
    <>
      <Topbar
        title="Hierarchy"
        subtitle="Institution explorer — drill into colleges, departments, and their courses"
      />
      <div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-background">
        <OrgExplorer
          view={view}
          courses={view.current ? courses : null}
          filters={{ search, status: status ?? "", term }}
        />
      </div>
    </>
  )
}
