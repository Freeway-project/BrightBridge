"use client";

import { useActionState, useMemo, useState } from "react";
import type { ProfileOption } from "@/lib/services/profiles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Search } from "lucide-react";
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

const MAX_VISIBLE_COURSES = 250;
const MAX_VISIBLE_TAS = 150;

export function AdminAssignmentPanel({ courses, tas }: AdminAssignmentPanelProps) {
  const [state, formAction, pending] = useActionState(assignTaToCourseAction, initialState);
  const [coursePickerOpen, setCoursePickerOpen] = useState(false);
  const [taPickerOpen, setTaPickerOpen] = useState(false);
  const [courseSearch, setCourseSearch] = useState("");
  const [taSearch, setTaSearch] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedTaId, setSelectedTaId] = useState<string>("");
  const canAssign = courses.length > 0 && tas.length > 0;
  const normalizedCourseSearch = courseSearch.trim().toLowerCase();
  const normalizedTaSearch = taSearch.trim().toLowerCase();

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? null,
    [courses, selectedCourseId]
  );

  const selectedTa = useMemo(
    () => tas.find((ta) => ta.id === selectedTaId) ?? null,
    [tas, selectedTaId]
  );

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

  const visibleCourses = useMemo(
    () => filteredCourses.slice(0, MAX_VISIBLE_COURSES),
    [filteredCourses]
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

  const visibleTas = useMemo(() => filteredTas.slice(0, MAX_VISIBLE_TAS), [filteredTas]);
  const canSubmit = canAssign && Boolean(selectedCourseId) && Boolean(selectedTaId) && !pending;

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
          <input type="hidden" name="courseId" value={selectedCourseId} />
          <input type="hidden" name="profileId" value={selectedTaId} />

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)_auto]">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground">Course</label>
              <Popover open={coursePickerOpen} onOpenChange={setCoursePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!canAssign || pending}
                    className="h-10 w-full justify-between px-3"
                  >
                    <span className="truncate text-left">
                      {selectedCourse ? selectedCourse.title : "Select a course to assign..."}
                    </span>
                    <ChevronsUpDown className="size-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[min(760px,calc(100vw-2rem))] p-0">
                  <div className="border-b p-3">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        autoFocus
                        value={courseSearch}
                        onChange={(e) => setCourseSearch(e.target.value)}
                        placeholder="Search by title or source course ID..."
                        className="h-10 pl-9 pr-8"
                      />
                      {courseSearch ? (
                        <button
                          type="button"
                          aria-label="Clear course search"
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                          onClick={() => setCourseSearch("")}
                        >
                          ×
                        </button>
                      ) : null}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {filteredCourses.length.toLocaleString()} matching course
                      {filteredCourses.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <ScrollArea className="h-[360px]">
                    {visibleCourses.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-center text-muted-foreground">
                        No courses match your search.
                      </p>
                    ) : (
                      <div className="p-2">
                        {visibleCourses.map((course) => (
                          <button
                            key={course.id}
                            type="button"
                            className={cn(
                              "flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-left hover:bg-muted",
                              course.id === selectedCourseId && "bg-muted"
                            )}
                            onClick={() => {
                              setSelectedCourseId(course.id);
                              setCoursePickerOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mt-0.5 size-4 shrink-0 text-primary",
                                course.id === selectedCourseId ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium">{course.title}</span>
                              <span className="block text-xs text-muted-foreground">
                                {course.sourceCourseId ?? "No source course ID"}
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                  {filteredCourses.length > MAX_VISIBLE_COURSES ? (
                    <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                      Showing first {MAX_VISIBLE_COURSES.toLocaleString()} results. Keep typing to narrow down.
                    </p>
                  ) : null}
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground">Assign to TA</label>
              <Popover open={taPickerOpen} onOpenChange={setTaPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!canAssign || pending}
                    className="h-10 w-full justify-between px-3"
                  >
                    <span className="truncate text-left">
                      {selectedTa ? selectedTa.fullName ?? selectedTa.email : "Select a TA..."}
                    </span>
                    <ChevronsUpDown className="size-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[min(460px,calc(100vw-2rem))] p-0">
                  <div className="border-b p-3">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        autoFocus
                        value={taSearch}
                        onChange={(e) => setTaSearch(e.target.value)}
                        placeholder="Search TA by name or email..."
                        className="h-10 pl-9 pr-8"
                      />
                      {taSearch ? (
                        <button
                          type="button"
                          aria-label="Clear TA search"
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                          onClick={() => setTaSearch("")}
                        >
                          ×
                        </button>
                      ) : null}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {filteredTas.length.toLocaleString()} matching TA{filteredTas.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <ScrollArea className="h-[320px]">
                    {visibleTas.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-center text-muted-foreground">
                        No TAs match your search.
                      </p>
                    ) : (
                      <div className="p-2">
                        {visibleTas.map((ta) => (
                          <button
                            key={ta.id}
                            type="button"
                            className={cn(
                              "flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-left hover:bg-muted",
                              ta.id === selectedTaId && "bg-muted"
                            )}
                            onClick={() => {
                              setSelectedTaId(ta.id);
                              setTaPickerOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mt-0.5 size-4 shrink-0 text-primary",
                                ta.id === selectedTaId ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium">{ta.fullName ?? "Unnamed TA"}</span>
                              <span className="block truncate text-xs text-muted-foreground">{ta.email}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                  {filteredTas.length > MAX_VISIBLE_TAS ? (
                    <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                      Showing first {MAX_VISIBLE_TAS.toLocaleString()} results. Keep typing to narrow down.
                    </p>
                  ) : null}
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-end lg:justify-end">
              <Button className="h-10 w-full px-5 sm:w-auto" disabled={!canSubmit} type="submit">
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
