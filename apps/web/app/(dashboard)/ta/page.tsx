import { getAccessibleCourses } from "@/lib/courses/service";
import { CourseListView, type CourseStat } from "@/components/courses/course-list-view";
import { TweakableContent } from "@/components/shared/tweakable-content";
import { TaRefreshWrapper } from "./_components/ta-refresh-wrapper";

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

  return (
    <TweakableContent className="flex-1 overflow-hidden">
      <TaRefreshWrapper>
        <CourseListView initialCourses={courses} stats={stats} />
      </TaRefreshWrapper>
    </TweakableContent>
  );
}
