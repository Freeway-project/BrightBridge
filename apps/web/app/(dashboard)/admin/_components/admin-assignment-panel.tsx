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
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Assign TA to Course</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {courses.length > 0
                ? `${courses.length.toLocaleString()} unassigned course${courses.length === 1 ? "" : "s"} awaiting a TA.`
                : "All courses have been assigned."}
            </p>
          </div>
          {state.kind === "success" && state.message && (
            <p className="text-sm text-green-600 text-right">{state.message}</p>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-[var(--card-spacing,1rem)] pt-0">
        <form action={formAction}>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] lg:grid-cols-[1fr_260px_auto]">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-foreground">Course</label>
              <Select disabled={!canAssign || pending} name="courseId" required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={courses.length ? "Select a course to assign…" : "All courses are assigned"} />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2 border-b sticky top-0 bg-popover z-10">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search by title or course ID…"
                        value={courseSearch}
                        onChange={(e) => setCourseSearch(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="h-8 pl-7 text-xs"
                      />
                    </div>
                  </div>
                  {filteredCourses.length === 0 ? (
                    <p className="px-3 py-4 text-xs text-center text-muted-foreground">No courses match your search.</p>
                  ) : (
                    filteredCourses.map((course) => (
                      <SelectItem key={course.id} value={course.id} className="text-sm">
                        <span className="font-medium">{course.title}</span>
                        {course.sourceCourseId ? (
                          <span className="ml-2 text-xs text-muted-foreground">({course.sourceCourseId})</span>
                        ) : null}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-foreground">Assign to TA</label>
              <Select disabled={!canAssign || pending} name="profileId" required>
                <SelectTrigger className="w-full lg:w-[260px]">
                  <SelectValue placeholder={tas.length ? "Select a TA…" : "No TA profiles found"} />
                </SelectTrigger>
                <SelectContent>
                  {tas.map((ta) => (
                    <SelectItem key={ta.id} value={ta.id}>
                      {ta.fullName ?? ta.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button className="w-full sm:w-auto" disabled={!canAssign || pending} type="submit">
                {pending ? "Assigning…" : "Assign TA"}
              </Button>
            </div>
          </div>

          {state.kind === "error" && state.message && (
            <p className="mt-3 text-sm text-destructive">{state.message}</p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
