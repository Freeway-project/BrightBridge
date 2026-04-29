"use client";

import { useActionState } from "react";
import type { CourseSummary } from "@/lib/courses/service";
import type { ProfileOption } from "@/lib/services/profiles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignTaToCourseAction, type AssignTaState } from "../actions";

type AdminAssignmentPanelProps = {
  courses: CourseSummary[];
  tas: ProfileOption[];
};

const initialState: AssignTaState = {
  kind: "idle",
  message: null,
};

export function AdminAssignmentPanel({ courses, tas }: AdminAssignmentPanelProps) {
  const [state, formAction, pending] = useActionState(assignTaToCourseAction, initialState);
  const canAssign = courses.length > 0 && tas.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Assign TA to Course</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
          <label className="grid gap-1.5 text-sm font-medium">
            Course
            <Select disabled={!canAssign || pending} name="courseId" required>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={courses.length ? "Select course" : "No courses available"} />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="grid gap-1.5 text-sm font-medium">
            TA
            <Select disabled={!canAssign || pending} name="profileId" required>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={tas.length ? "Select TA" : "No TA profiles found"} />
              </SelectTrigger>
              <SelectContent>
                {tas.map((ta) => (
                  <SelectItem key={ta.id} value={ta.id}>
                    {ta.fullName ?? ta.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <div className="flex items-end">
            <Button className="w-full lg:w-auto" disabled={!canAssign || pending} type="submit">
              {pending ? "Assigning..." : "Assign TA"}
            </Button>
          </div>

          {state.message ? (
            <p
              className={
                state.kind === "success"
                  ? "text-sm text-green-600 lg:col-span-3"
                  : "text-sm text-destructive lg:col-span-3"
              }
            >
              {state.message}
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
