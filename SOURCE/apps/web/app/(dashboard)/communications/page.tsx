import { Topbar } from "@/components/layout/topbar"
import { TweakableContent } from "@/components/shared/tweakable-content"
import { requireAnyRole, requireProfile } from "@/lib/auth/context"
import { getAdminCoursesPage } from "@/lib/admin/queries"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { Send, Clock, PackageOpen } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function CommunicationsDashboardPage() {
  const context = await requireProfile()
  requireAnyRole(context, ["admin_viewer", "admin_full", "super_admin"])

  const queue = await getAdminCoursesPage({ page: 1, pageSize: 200, status: "ready_for_instructor" })
  const courses = queue.data

  return (
    <>
      <Topbar title="Handoff Queue" subtitle="Courses ready to be sent to instructors" role={context.profile.role} />
      <TweakableContent className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Stats */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5">
              <Clock className="size-4 text-amber-500" />
              <span className="text-sm font-semibold">{courses.length}</span>
              <span className="text-xs text-muted-foreground">awaiting handoff</span>
            </div>
          </div>

          {/* Queue table */}
          {courses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <PackageOpen className="size-10 opacity-40" />
              <p className="text-sm font-medium">No courses awaiting handoff</p>
              <p className="text-xs">Courses approved by admin will appear here.</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Course</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">TA</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Term</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Waiting</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {courses.map((course) => (
                    <tr key={course.id} className="bg-card hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground leading-tight">{course.title}</p>
                        {course.sourceCourseId && (
                          <p className="text-[11px] text-muted-foreground font-mono">{course.sourceCourseId}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-muted-foreground">{course.ta?.name ?? course.ta?.email ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-muted-foreground">{course.term ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(course.updatedAt), { addSuffix: true })}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <Button size="sm" variant="outline" className="h-7 px-3 text-xs gap-1.5" asChild>
                            <Link href={`/communications/courses/${course.id}`}>
                              <Send className="size-3" />
                              Review &amp; Send
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </TweakableContent>
    </>
  )
}
