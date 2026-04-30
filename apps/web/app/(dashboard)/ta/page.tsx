import { getAccessibleCourses } from "@/lib/courses/service";
import { CourseListView, type CourseStat } from "@/components/courses/course-list-view";

export default async function TADashboardPage() {
  const { courses } = await getAccessibleCourses();

  const stats: CourseStat[] = [
    { 
      label: "Assigned", 
      value: courses.length, 
      icon: "book-open",
    },
    { 
      label: "In Progress", 
      value: courses.filter(c => c.status === "ta_review_in_progress").length, 
      icon: "clock",
    },
    { 
      label: "Submitted to Admin", 
      value: courses.filter(c => c.status === "submitted_to_admin").length, 
      icon: "check-square",
    },
    { 
      label: "Changes Requested", 
      value: courses.filter(c => c.status === "admin_changes_requested").length, 
      icon: "alert-triangle",
    },
  ];

  return <CourseListView initialCourses={courses} stats={stats} />;
}
