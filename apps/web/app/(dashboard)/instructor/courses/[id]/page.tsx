import { notFound } from "next/navigation"
import { Topbar } from "@/components/layout/topbar"
import { requireProfile } from "@/lib/auth/context"
import { getAdminCourseDetail } from "@/lib/admin/queries"
import { resolveDelegationContext } from "@/lib/courses/service"
import { getCourseRepository, getHierarchyRepository } from "@/lib/repositories"
import { CourseSwitcher } from "./_components/course-switcher"
import { CourseSwitchSidebar } from "./_components/course-switch-sidebar"
import { InstructorReviewDetail } from "./_components/instructor-review-detail"
import { InstructorAccordionView } from "./_components/instructor-accordion-view"
import { InstructorCourseShell } from "./_components/instructor-course-shell"
import { getSharedComments } from "@/lib/services/comments"

interface Props {
  params: Promise<{ id: string }>
}

export default async function InstructorCourseDetailPage({ params }: Props) {
  const { id } = await params
  const context = await requireProfile()

  if (context.profile.role !== "instructor" && context.profile.role !== "super_admin") {
    notFound()
  }

  // Assigned instructors get the full workspace. Org-hierarchy leaders (dean /
  // dept-head / etc.) may ACT on the assigned instructor's behalf — approve, ask,
  // talk to the TA — for any course in their subtree. Super admins keep a
  // read-only hierarchy view.
  const assignedCourse = await getCourseRepository().getAssignedCourseById(id, context.profile.id, "instructor")
  const delegation = assignedCourse
    ? null
    : await resolveDelegationContext({ courseId: id, profile: context.profile })
  const canActViaDelegation = delegation?.delegated ?? false
  const canViewViaHierarchy =
    !assignedCourse &&
    (context.profile.role === "super_admin" ||
      canActViaDelegation ||
      (await getHierarchyRepository().hasHierarchyAccess(context.profile.id, id)))
  if (!assignedCourse && !canViewViaHierarchy) notFound()

  // Read-only unless you're the assigned instructor OR a leader acting on their
  // behalf. (Super-admin hierarchy views stay read-only.)
  const readOnly = !assignedCourse && !canActViaDelegation

  // Record the dashboard open for the indicator dot. Only the assigned
  // instructor counts — hierarchy/super-admin read-only views shouldn't
  // pollute the "did the instructor open it?" signal.
  if (assignedCourse && context.profile.role === "instructor") {
    const { recordInstructorView } = await import("@/lib/instructor-views/service")
    await recordInstructorView(id, context.profile.id)
  }

  const [detail, sharedComments, myCourses] = await Promise.all([
    getAdminCourseDetail(id),
    getSharedComments(id),
    getCourseRepository().listInstructorCourses(context.profile.id),
  ])
  if (!detail) notFound()

  const { course, responses, sectionKeyById } = detail

  return (
    <>
      <Topbar
        title={course.title}
        subtitle={course.sourceCourseId ?? undefined}
        backHref="/instructor"
        role={context.profile.role}
        actions={
          <CourseSwitcher
            currentId={id}
            courses={myCourses.map((c) => ({ id: c.id, title: c.title, status: c.status }))}
            className="md:hidden"
          />
        }
      />
      <main className="flex-1 flex overflow-hidden bg-background">
        <CourseSwitchSidebar
          currentId={id}
          courses={myCourses.map((c) => ({ id: c.id, title: c.title, status: c.status, term: c.term }))}
        />
        <InstructorCourseShell
          courseId={id}
          status={course.status}
          finalSummary={course.instructorSummaryNotes}
          readOnly={readOnly}
          actingOnBehalfOfName={canActViaDelegation ? (delegation?.onBehalfOfName ?? null) : null}
          actingAsTitle={canActViaDelegation ? (delegation?.leaderTitle ?? null) : null}
          reviewNode={
            <InstructorReviewDetail
              course={course}
              responses={responses}
              sectionKeyById={sectionKeyById}
            />
          }
          full={
            <InstructorAccordionView
              courseId={id}
              status={course.status}
              finalSummary={course.instructorSummaryNotes}
              readOnly={readOnly}
              sharedComments={sharedComments}
              currentUserId={context.userId}
              actingOnBehalfOfName={canActViaDelegation ? (delegation?.onBehalfOfName ?? null) : null}
              actingAsTitle={canActViaDelegation ? (delegation?.leaderTitle ?? null) : null}
              meta={{
                term: course.term,
                department: course.department,
                sourceCourseId: course.sourceCourseId,
                targetCourseId: course.targetCourseId,
              }}
              reviewNode={
                <InstructorReviewDetail
                  course={course}
                  responses={responses}
                  sectionKeyById={sectionKeyById}
                />
              }
            />
          }
        />
      </main>
    </>
  )
}
