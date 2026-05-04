"use client";

import { useActionState, useMemo, useState } from "react";
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
  const [taSearch, setTaSearch] = useState("");
  const canAssign = courses.length > 0 && tas.length > 0;
  const normalizedCourseSearch = courseSearch.trim().toLowerCase();
  const normalizedTaSearch = taSearch.trim().toLowerCase();

  const filteredCourses = useMemo(
    () =>
      courses.filter((course) => {
        if (!normalizedCourseSearch) return true;
        return (
          course.title.toLowerCase().includes(normalizedCourseSearch) ||
          course.sourceCourseId?.toLowerCase().includes(normalizedCourseSearch)
        );
      }),
    [courses, normalizedCourseSearch]
  );

  const filteredTas = useMemo(
    () =>
      tas.filter((ta) => {
        if (!normalizedTaSearch) return true;
        const name = (ta.fullName ?? "").toLowerCase();
        const email = ta.email.toLowerCase();
        return name.includes(normalizedTaSearch) || email.includes(normalizedTaSearch);
      }),
    [tas, normalizedTaSearch]
  );

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
                  <div className="sticky top-0 z-10 border-b bg-popover p-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search by title or course ID…"
                        value={courseSearch}
                        onChange={(e) => setCourseSearch(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="h-8 pl-7 pr-7 text-xs"
                      />
                      {courseSearch ? (
                        <button
                          type="button"
                          aria-label="Clear course search"
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                          onClick={() => setCourseSearch("")}
                        >
                          ×
                        </button>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {filteredCourses.length.toLocaleString()} result{filteredCourses.length === 1 ? "" : "s"}
                    </p>
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
                  <div className="sticky top-0 z-10 border-b bg-popover p-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search TA by name or email…"
                        value={taSearch}
                        onChange={(e) => setTaSearch(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="h-8 pl-7 pr-7 text-xs"
                      />
                      {taSearch ? (
                        <button
                          type="button"
                          aria-label="Clear TA search"
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                          onClick={() => setTaSearch("")}
                        >
                          ×
                        </button>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {filteredTas.length.toLocaleString()} TA{filteredTas.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  {filteredTas.length === 0 ? (
                    <p className="px-3 py-4 text-xs text-center text-muted-foreground">No TAs match your search.</p>
                  ) : (
                    filteredTas.map((ta) => (
                      <SelectItem key={ta.id} value={ta.id}>
                        {ta.fullName ?? ta.email}
                      </SelectItem>
                    ))
                  )}
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
