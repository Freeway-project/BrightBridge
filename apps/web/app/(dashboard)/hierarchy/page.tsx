import { redirect } from "next/navigation"
import { COURSE_STATUSES, type CourseStatus } from "@coursebridge/workflow"
import { Topbar } from "@/components/layout/topbar"
import { getAuthContext } from "@/lib/auth/context"
import { getOrgExplorerCourses, getOrgExplorerView } from "@/lib/hierarchy/explorer-queries"
import { OrgExplorer } from "@/components/hierarchy/org-explorer"
import { getHierarchyRepository } from "@/lib/repositories"

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

  if (context.kind !== "profile") {
    redirect("/dashboard")
  }

  const role = context.profile.role
  const hierarchy = getHierarchyRepository()
  const userUnits = await hierarchy.getUserUnits(context.profile.id)
  const { LEADERSHIP_TITLES, highestLeadershipTitle } = await import("@/lib/hierarchy/leadership")
  const leadershipUnits = userUnits.filter((u) => LEADERSHIP_TITLES.has(u.title))
  const isLeader = leadershipUnits.length > 0

  const isGlobalViewer =
    role === "admin_full" ||
    role === "admin_viewer" ||
    role === "provost" ||
    role === "super_admin"

  if (!isGlobalViewer && !isLeader) {
    redirect("/dashboard")
  }

  const sp = searchParams instanceof Promise ? await searchParams : searchParams
  let unit = str(sp?.unit) || null

  if (!isGlobalViewer && isLeader && !unit) {
    const topTitle = highestLeadershipTitle(leadershipUnits.map((u) => u.title))
    const topUnit = leadershipUnits.find((u) => u.title === topTitle)
    if (topUnit) {
      redirect(`/hierarchy?unit=${topUnit.orgUnitId}`)
    }
  }
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
        subtitle="Institution explorer — drill into schools, departments, and their courses"
      />
      <div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-background">
        <OrgExplorer
          view={view}
          courses={view.current ? courses : null}
          filters={{ search, status: status ?? "", term }}
          role={context.profile.role}
        />
      </div>
    </>
  )
}
