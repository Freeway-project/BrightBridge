"use client";

import { useActionState, useState } from "react";
import type { ProfileOption } from "@/lib/services/profiles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { assignTaToCourseAction, type AssignTaState } from "../actions";

type AssignableCourse = {
  id: string;
  title: string;
  sourceCourseId: string | null;
};

type AdminAssignmentPanelProps = {
  courses: AssignableCourse[];
  tas: ProfileOption[];
};

const initialState: AssignTaState = {
  kind: "idle",
  message: null,
};

export function AdminAssignmentPanel({ courses, tas }: AdminAssignmentPanelProps) {
  const [state, formAction, pending] = useActionState(assignTaToCourseAction, initialState);
  const [courseSearch, setCourseSearch] = useState("");
  const canAssign = courses.length > 0 && tas.length > 0;

  const filteredCourses = courses.filter((course) => {
    const term = courseSearch.toLowerCase();
    return (
      course.title.toLowerCase().includes(term) ||
      course.sourceCourseId?.toLowerCase().includes(term)
    );
  });

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
                <SelectValue placeholder={courses.length ? "Select course" : "All courses assigned"} />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2 border-b sticky top-0 bg-popover z-10">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search courses..."
                      value={courseSearch}
                      onChange={(e) => setCourseSearch(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      className="h-8 pl-7 text-xs"
                    />
                  </div>
                </div>
                {filteredCourses.length === 0 ? (
                  <p className="p-2 text-xs text-center text-muted-foreground">No courses found</p>
                ) : (
                  filteredCourses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title} {course.sourceCourseId ? `(${course.sourceCourseId})` : ""}
                    </SelectItem>
                  ))
                )}
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
