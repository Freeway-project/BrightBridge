import {
  ACCESSIBLE_COURSES_PAGE_SIZE,
  getAccessibleCourseAggregates,
  getAccessibleCoursesPage,
} from "@/lib/courses/service";
import { requireProfile } from "@/lib/auth/context";
import { PaginatedCourseListView } from "@/components/courses/paginated-course-list-view";
import { WORKFLOW_PHASES, type CourseStatus } from "@coursebridge/workflow";

function pickInitialStatus(
  statusCounts: Partial<Record<CourseStatus, number>>,
): CourseStatus | undefined {
  // Mirror the prior view default: jump to the first phase/sub-group that
  // actually has courses, so the first SSR query lands on a non-empty page.
  for (const phase of WORKFLOW_PHASES) {
    for (const group of phase.groups) {
      for (const status of group.statuses) {
        if ((statusCounts[status] ?? 0) > 0) return status;
      }
    }
  }
  return undefined;
}

export default async function CoursesPage() {
  const ctx = await requireProfile();
  const canExport = ctx.profile.role === "admin_full" || ctx.profile.role === "super_admin";

  const aggregates = await getAccessibleCourseAggregates();
  const initialStatus = pickInitialStatus(aggregates.statusCounts);
  const initialPage = await getAccessibleCoursesPage({
    page: 1,
    pageSize: ACCESSIBLE_COURSES_PAGE_SIZE,
    status: initialStatus,
  });

  return (
    <PaginatedCourseListView
      aggregates={aggregates}
      initialStatus={initialStatus}
      initialPage={initialPage}
      pageSize={ACCESSIBLE_COURSES_PAGE_SIZE}
      canExport={canExport}
    />
  );
}
