import { Topbar } from "@/components/layout/topbar"
import { getInstructorDashboardData } from "@/lib/courses/service"
import { InstructorCourseList } from "./_components/instructor-course-list"
import { DepartmentMonitor } from "./_components/department-monitor"

export default async function InstructorDashboardPage() {
  const { myCourses, departmentCourses, isDeptHead } = await getInstructorDashboardData()

  return (
    <>
      <Topbar title="My Course Reviews" />
      <main className="flex-1 overflow-y-auto p-6 space-y-8">
        <InstructorCourseList courses={myCourses} />
        {isDeptHead && <DepartmentMonitor courses={departmentCourses} />}
      </main>
    </>
  )
}
