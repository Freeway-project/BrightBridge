"use client";

import * as Sentry from "@sentry/nextjs";
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { ProfileOption } from "@/lib/services/profiles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react";
import { assignTaToCourseAction, searchAssignableCoursesAction, type AssignTaState } from "../actions";

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
const SEARCH_DEBOUNCE_MS = 300;

export function AdminAssignmentPanel({ courses, tas }: AdminAssignmentPanelProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(assignTaToCourseAction, initialState);
  const [coursePickerOpen, setCoursePickerOpen] = useState(false);
  const [taPickerOpen, setTaPickerOpen] = useState(false);
  const [courseSearch, setCourseSearch] = useState("");
  const [courseYear, setCourseYear] = useState<string>("all");
  const [courseTerm, setCourseTerm] = useState<string>("all");
  const [taSearch, setTaSearch] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedCourseObj, setSelectedCourseObj] = useState<AssignableCourse | null>(null);
  const [selectedTaId, setSelectedTaId] = useState<string>("");
  const [availableCourses, setAvailableCourses] = useState<AssignableCourse[]>(courses);
  const [searchResults, setSearchResults] = useState<AssignableCourse[] | null>(null);
  const [isSearching, startSearch] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedCourseIdRef = useRef(selectedCourseId);
  selectedCourseIdRef.current = selectedCourseId;

  const canAssign = availableCourses.length > 0 || (searchResults?.length ?? 0) > 0;
  const normalizedTaSearch = taSearch.trim().toLowerCase();

  // All known courses: search results when searching, initial list otherwise
  const activeCourseList = courseSearch.trim() ? (searchResults ?? []) : availableCourses;

  useEffect(() => {
    setAvailableCourses(courses);
  }, [courses]);

  const filteredCourseList = useMemo(() => {
    return activeCourseList.filter((course) => {
      if (courseYear === "all" && courseTerm === "all") return true;
      const textToSearch = `${course.title} ${course.sourceCourseId ?? ""}`;
      
      if (courseYear !== "all" && courseTerm !== "all") {
        return textToSearch.includes(`${courseYear}${courseTerm}`) || 
               textToSearch.includes(`${courseTerm}${courseYear}`);
      }
      
      if (courseYear !== "all") {
        return textToSearch.includes(courseYear);
      }
      
      if (courseTerm !== "all") {
        const termRegex = new RegExp(`(${courseTerm}\\d{4}|\\d{4}${courseTerm})\\b`);
        return termRegex.test(textToSearch);
      }
      
      return true;
    });
  }, [activeCourseList, courseYear, courseTerm]);

  const selectedCourse = useMemo(
    () => filteredCourseList.find((course) => course.id === selectedCourseId) ??
          availableCourses.find((course) => course.id === selectedCourseId) ?? null,
    [filteredCourseList, availableCourses, selectedCourseId]
  );

  const selectedTa = useMemo(
    () => tas.find((ta) => ta.id === selectedTaId) ?? null,
    [tas, selectedTaId]
  );

  const handleCourseSearchChange = useCallback((value: string) => {
    setCourseSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = value.trim();
    if (!trimmed) {
      setSearchResults(null);
      return;
    }
    debounceRef.current = setTimeout(() => {
      startSearch(async () => {
        try {
          const results = await searchAssignableCoursesAction(trimmed);
          setSearchResults(results);
        } catch (error) {
          Sentry.withScope((scope) => {
            scope.setTag("area", "admin_assignment");
            scope.setTag("action", "search_assignable_courses");
            scope.setContext("search", { term: trimmed });
            Sentry.captureException(error instanceof Error ? error : new Error("Course search failed"));
          });
          toast.error("Search failed. Please try again.");
          setSearchResults([]);
        }
      });
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  useEffect(() => {
    if (state.kind === "success" && state.message) {
      toast.success(state.message);
      router.refresh();
      const id = selectedCourseIdRef.current;
      if (id) {
        setAvailableCourses((current) => current.filter((course) => course.id !== id));
        setSearchResults((current) =>
          current ? current.filter((course) => course.id !== id) : current,
        );
      }
      setSelectedCourseId("");
      setSelectedCourseObj(null);
      setSelectedTaId("");
      setCourseSearch("");
      setTaSearch("");
    } else if (state.kind === "error" && state.message) {
      Sentry.withScope((scope) => {
        scope.setTag("area", "admin_assignment");
        scope.setTag("action", "assign_ta_to_course");
        scope.setLevel("warning");
        scope.setContext("ui_state", {
          selectedCourseId: selectedCourseIdRef.current || null,
          selectedTaId: selectedTaId || null,
          message: state.message,
        });
        Sentry.captureMessage("[AdminAssignmentPanel] assignment error surfaced in UI");
      });
      toast.error(state.message);
    }
  }, [state, router]);

  const visibleCourses = useMemo(
    () => filteredCourseList.slice(0, MAX_VISIBLE_COURSES),
    [filteredCourseList]
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

  const courseResultCount = filteredCourseList.length;

  const visibleTas = useMemo(() => filteredTas.slice(0, MAX_VISIBLE_TAS), [filteredTas]);
  const canSubmit = canAssign && Boolean(selectedCourseId) && Boolean(selectedTaId) && !pending;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div>
          <CardTitle className="text-base">Assign TA to Course</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {availableCourses.length > 0
              ? `${availableCourses.length.toLocaleString()} unassigned course${availableCourses.length === 1 ? "" : "s"} awaiting a TA. Search to find any course.`
              : "All courses have been assigned."}
          </p>
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
                      {selectedCourseObj ? selectedCourseObj.title : "Select a course to assign..."}
                    </span>
                    <ChevronsUpDown className="size-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[min(760px,calc(100vw-2rem))] p-0">
                  <div className="border-b p-3 space-y-3">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <Select value={courseYear} onValueChange={setCourseYear}>
                        <SelectTrigger className="w-full sm:w-[130px] h-10">
                          <SelectValue placeholder="Any Year" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any Year</SelectItem>
                          {Array.from({ length: 21 }, (_, i) => 2010 + i).map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={courseTerm} onValueChange={setCourseTerm}>
                        <SelectTrigger className="w-full sm:w-[160px] h-10">
                          <SelectValue placeholder="Any Term" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any Term</SelectItem>
                          <SelectItem value="10">Winter (10)</SelectItem>
                          <SelectItem value="11">Winter CS (11)</SelectItem>
                          <SelectItem value="20">Summer (20)</SelectItem>
                          <SelectItem value="21">Spring CS (21)</SelectItem>
                          <SelectItem value="22">Summer CS (22)</SelectItem>
                          <SelectItem value="30">Fall (30)</SelectItem>
                          <SelectItem value="31">Fall CS (31)</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          autoFocus
                          value={courseSearch}
                          onChange={(e) => handleCourseSearchChange(e.target.value)}
                          placeholder="Search by title or source course ID..."
                          className="h-10 pl-9 pr-8"
                        />
                        {isSearching ? (
                          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
                        ) : courseSearch ? (
                          <button
                            type="button"
                            aria-label="Clear course search"
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                            onClick={() => { handleCourseSearchChange(""); }}
                          >
                            ×
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isSearching ? "Searching…" : `${courseResultCount.toLocaleString()} matching course${courseResultCount === 1 ? "" : "s"}`}
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
                              setSelectedCourseObj(course);
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
                  {courseResultCount > MAX_VISIBLE_COURSES ? (
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
