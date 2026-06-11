import { getAccessibleCourses } from "@/lib/courses/service";
import { requireProfile } from "@/lib/auth/context";
import { CourseListView } from "@/components/courses/course-list-view";

export default async function CoursesPage() {
  const { courses } = await getAccessibleCourses();
  const ctx = await requireProfile();
  const canExport = ctx.profile.role === "admin_full" || ctx.profile.role === "super_admin";

  // The (dashboard) layout handles Auth and Sidebar.
  // We just need to render the content.
  return <CourseListView initialCourses={courses} canExport={canExport} />;
}
