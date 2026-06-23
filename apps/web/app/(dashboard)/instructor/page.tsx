import { Topbar } from "@/components/layout/topbar"
import { getInstructorDashboardData } from "@/lib/courses/service"
import { getHierarchyRepository } from "@/lib/repositories"
import { getAuthContext } from "@/lib/auth/context"
import { redirect } from "next/navigation"
import { TweakableContent } from "@/components/shared/tweakable-content"
import { InstructorInbox } from "./_components/instructor-inbox"
import { InstructorDashboardTabs } from "./_components/instructor-dashboard-tabs"

type SearchParams = Record<string, string | string[] | undefined>

interface Props {
  searchParams?: Promise<SearchParams> | SearchParams
}

export default async function InstructorDashboardPage({ searchParams }: Props) {
  const context = await getAuthContext()
  if (context.kind !== "profile") {
    redirect("/dashboard")
  }

  const { myCourses, departmentCourses, isDeptHead } = await getInstructorDashboardData()

  let explorerView = null
  let explorerCourses = null
  let activeUnit = null
  const sp = searchParams instanceof Promise ? await searchParams : searchParams
  const search = typeof sp?.search === "string" ? sp.search : ""
  const statusParam = typeof sp?.status === "string" ? sp.status : ""
  const term = typeof sp?.term === "string" ? sp.term : ""

  if (isDeptHead) {
    const { getOrgExplorerView, getOrgExplorerCourses } = await import("@/lib/hierarchy/explorer-queries")
    const { LEADERSHIP_TITLES, highestLeadershipTitle } = await import("@/lib/hierarchy/leadership")

    const hierarchy = getHierarchyRepository()
    const userUnits = await hierarchy.getUserUnits(context.profile.id)
    const leadershipUnits = userUnits.filter((u) => LEADERSHIP_TITLES.has(u.title))

    const paramUnit = typeof sp?.unit === "string" ? sp.unit : null
    activeUnit = paramUnit

    if (!activeUnit) {
      const topTitle = highestLeadershipTitle(leadershipUnits.map((u) => u.title))
      const topUnit = leadershipUnits.find((u) => u.title === topTitle)
      activeUnit = topUnit ? topUnit.orgUnitId : null
    }

    if (activeUnit) {
      const page = Math.max(1, Number(typeof sp?.page === "string" ? sp.page : "1") || 1)

      try {
        explorerView = await getOrgExplorerView(activeUnit)
        explorerCourses = await getOrgExplorerCourses(activeUnit, {
          page,
          pageSize: 20,
          search: search || undefined,
          status: statusParam as any,
          term: term || undefined,
        })
      } catch (err) {
        // Safe redirect fallback for URL tempering
        const topTitle = highestLeadershipTitle(leadershipUnits.map((u) => u.title))
        const topUnit = leadershipUnits.find((u) => u.title === topTitle)
        if (topUnit && topUnit.orgUnitId !== activeUnit) {
          redirect(`/instructor?unit=${topUnit.orgUnitId}`)
        }
        throw err
      }
    }
  }

  return (
    <>
      <Topbar title="My Course Reviews" />
      <TweakableContent className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-5xl space-y-10">
          {isDeptHead && explorerView ? (
            <InstructorDashboardTabs
              myCourses={myCourses}
              departmentCourses={departmentCourses}
              explorerView={explorerView}
              explorerCourses={explorerCourses}
              role={context.profile.role}
              filters={{ search, status: statusParam, term }}
            />
          ) : (
            <InstructorInbox
              courses={myCourses}
              heading="Needs your review"
              subheading="Courses sent to you — review and approve, or ask the team a question."
              emptyHint="When a course is ready for you, it'll show up here."
              actionVerb="Review & approve"
            />
          )}
        </div>
      </TweakableContent>
    </>
  )
}
