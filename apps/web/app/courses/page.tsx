import Link from "next/link";
import { redirect } from "next/navigation";
import { getCourseStatusLabel } from "@coursebridge/workflow";
import { getAccessibleCourses } from "@/lib/courses/service";

export default async function CoursesPage() {
  const { context, courses } = await getAccessibleCourses();

  if (context.kind === "anonymous") {
    redirect("/auth/login");
  }

  if (context.kind === "missing_profile") {
    return (
      <main className="min-h-screen bg-background">
        <div className="border-b border-border bg-card">
          <div className="mx-auto max-w-7xl px-6 py-4">
            <p className="text-sm font-medium text-muted-foreground">CourseBridge</p>
            <h1 className="text-2xl font-semibold">Courses</h1>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 py-8">
          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-xl font-semibold">Profile Required</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              You are signed in as {context.email ?? "this user"}, but this account
              does not have a CourseBridge profile yet.
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <p className="text-sm font-medium text-muted-foreground">CourseBridge</p>
          <h1 className="text-2xl font-semibold">Courses</h1>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-xl font-semibold">Accessible Courses</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Signed in as {context.profile.email} with role {context.profile.role}.
            RLS filters this list at the database layer.
          </p>

          <div className="mt-6 overflow-hidden rounded-md border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Course</th>
                  <th className="px-4 py-3 font-medium">Term</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {courses.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-muted-foreground" colSpan={3}>
                      No courses are visible for this profile yet.
                    </td>
                  </tr>
                ) : (
                  courses.map((course) => (
                    <tr className="border-t border-border" key={course.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{course.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {course.sourceCourseId ?? "No source ID"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {course.term ?? "Unassigned"}
                      </td>
                      <td className="px-4 py-3">
                        {getCourseStatusLabel(course.status)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Link
            className="mt-6 inline-flex h-10 items-center rounded-md border border-input px-4 text-sm font-medium"
            href="/dashboard"
          >
            Back to dashboard
          </Link>
        </section>
      </div>
    </main>
  );
}
