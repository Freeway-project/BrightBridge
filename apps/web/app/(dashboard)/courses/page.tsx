import { getAccessibleCourses } from "@/lib/courses/service";
import { CourseListView } from "@/components/courses/course-list-view";

export default async function CoursesPage() {
  const { courses } = await getAccessibleCourses();

  // The (dashboard) layout handles Auth and Sidebar.
  // We just need to render the content.
  return <CourseListView initialCourses={courses} />;
}
