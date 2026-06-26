"use client";

import { StatusBadge } from "@/components/courses/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SentToInstructorCourse } from "@/lib/admin/queries";
import { formatDistanceToNow } from "date-fns";
import { InstructorPreviewButton } from "./instructor-preview-button";

type Props = {
  courses: SentToInstructorCourse[];
};

export function SentCoursesTable({ courses }: Props) {
  if (courses.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No courses are currently in the instructor review phase.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Instructor Review</CardTitle>
        <p className="text-sm text-muted-foreground">
          Courses that have already been sent to instructors or are currently being reviewed by them.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Course</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Instructor</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Last Updated</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr
                  key={course.courseId}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-2.5 font-medium">
                    <a
                      href={`/admin/courses/${course.courseId}`}
                      className="hover:underline"
                    >
                      {course.courseTitle}
                    </a>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {course.instructorName ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {course.instructorEmail ?? "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={course.status} className="h-5" />
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(course.updatedAt), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-2.5">
                    {course.instructorEmail ? (
                      <InstructorPreviewButton
                        courseId={course.courseId}
                        instructorEmail={course.instructorEmail}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
