import { requireAnyRole, requireProfile } from "@/lib/auth/context"
import { getAllSuperAdminCourses } from "@/lib/super-admin/course-export-data"
import { COURSE_STATUS_LABELS } from "@coursebridge/workflow"
import { PrintToolbar } from "./[id]/_components/print-toolbar"

// Always render fresh — the export should reflect the latest course data.
export const dynamic = "force-dynamic"

type SearchParams = Record<string, string | string[] | undefined>

interface Props {
  searchParams?: Promise<SearchParams> | SearchParams
}

function fmtDate(value?: string | null) {
  if (!value) return ""
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export default async function CoursesPrintPage({ searchParams }: Props) {
  const context = await requireProfile()
  requireAnyRole(context, ["admin_full", "super_admin"])

  const resolved = searchParams instanceof Promise ? await searchParams : searchParams
  const search = typeof resolved?.search === "string" ? resolved.search : ""

  const courses = await getAllSuperAdminCourses(search)
  const generatedAt = new Date().toLocaleString("en-US")

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <PrintToolbar />
      <div className="mx-auto max-w-5xl px-8 py-6 print:px-0 print:py-0">
        <header className="mb-4 border-b border-gray-300 pb-3">
          <h1 className="text-xl font-bold">All Courses</h1>
          <p className="text-sm text-gray-600">
            {courses.length} course{courses.length === 1 ? "" : "s"}
            {search ? ` matching “${search}”` : ""} · Generated {generatedAt}
          </p>
        </header>

        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-gray-400 text-left">
              <th className="py-1.5 pr-3 font-semibold">Code</th>
              <th className="py-1.5 pr-3 font-semibold">Title</th>
              <th className="py-1.5 pr-3 font-semibold">Status</th>
              <th className="py-1.5 pr-3 font-semibold">TA</th>
              <th className="py-1.5 pr-3 font-semibold">Instructor</th>
              <th className="py-1.5 font-semibold">Updated</th>
            </tr>
          </thead>
          <tbody>
            {courses.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-gray-500">
                  No courses found.
                </td>
              </tr>
            ) : (
              courses.map((c) => (
                <tr key={c.id} className="border-b border-gray-200 align-top">
                  <td className="py-1.5 pr-3 whitespace-nowrap">{c.code ?? "—"}</td>
                  <td className="py-1.5 pr-3">{c.title}</td>
                  <td className="py-1.5 pr-3 whitespace-nowrap">
                    {COURSE_STATUS_LABELS[c.status] ?? c.status}
                  </td>
                  <td className="py-1.5 pr-3">{c.ta?.name ?? c.ta?.email ?? "Unassigned"}</td>
                  <td className="py-1.5 pr-3">{c.instructor?.name ?? c.instructor?.email ?? "Pending"}</td>
                  <td className="py-1.5 whitespace-nowrap">{fmtDate(c.updated_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
