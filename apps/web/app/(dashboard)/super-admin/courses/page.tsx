import { Topbar } from "@/components/layout/topbar"
import { getPaginatedSuperAdminCourses } from "@/lib/super-admin/queries"
import { getAuthContext } from "@/lib/auth/context"
import { redirect } from "next/navigation"
import { CoursesView } from "@/components/super-admin/courses-view"
import { TweakableContent } from "@/components/shared/tweakable-content"

type SearchParams = Record<string, string | string[] | undefined>

interface Props {
  searchParams?: Promise<SearchParams> | SearchParams
}

export default async function SuperAdminCoursesPage({ searchParams }: Props) {
  const context = await getAuthContext()

  if (context.kind !== "profile" || context.profile.role !== "super_admin") {
    redirect("/dashboard")
  }

  const resolvedSearchParams = searchParams instanceof Promise ? await searchParams : searchParams
  const page = Number(resolvedSearchParams?.page ?? 1)
  const search = typeof resolvedSearchParams?.search === "string" ? resolvedSearchParams.search : undefined

  const paginatedResult = await getPaginatedSuperAdminCourses(page, 20, search ?? "")

  return (
    <>
      <Topbar title="All Courses" subtitle="Super Admin" backHref="/super-admin" />
      <TweakableContent className="flex-1 overflow-hidden">
        <CoursesView result={paginatedResult} search={search ?? ""} />
      </TweakableContent>
    </>
  )
}
