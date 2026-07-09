"use client";
import { LottieLoader } from "@/components/ui/lottie-loader"

import * as Sentry from "@sentry/nextjs";
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type { ProfileOption } from "@/lib/services/profiles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchBar } from "@/components/ui/search-bar";
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
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { batchAssignTaAction, searchAssignableCoursesAction, type AssignTaState } from "../actions";

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
  const [state, formAction, pending] = useActionState(batchAssignTaAction, initialState);
  const [coursePickerOpen, setCoursePickerOpen] = useState(false);
  const [taPickerOpen, setTaPickerOpen] = useState(false);
  const [courseSearch, setCourseSearch] = useState("");
  const [courseYear, setCourseYear] = useState<string>("all");
  const [courseTerm, setCourseTerm] = useState<string>("all");
  const [taSearch, setTaSearch] = useState("");
  
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [selectedCourseObjs, setSelectedCourseObjs] = useState<AssignableCourse[]>([]);
  const [selectedTaId, setSelectedTaId] = useState<string>("");
  
  const [availableCourses, setAvailableCourses] = useState<AssignableCourse[]>(courses);
  const [searchResults, setSearchResults] = useState<AssignableCourse[] | null>(null);
  const [isSearching, startSearch] = useTransition();

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

  const selectedTa = useMemo(
    () => tas.find((ta) => ta.id === selectedTaId) ?? null,
    [tas, selectedTaId]
  );

  const runCourseSearch = useCallback((value: string) => {
    if (!value) {
      setSearchResults(null);
      return;
    }
    startSearch(async () => {
      try {
        const results = await searchAssignableCoursesAction(value);
        setSearchResults(results);
      } catch (error) {
        Sentry.withScope((scope) => {
          scope.setTag("area", "admin_assignment");
          scope.setTag("action", "search_assignable_courses");
          scope.setContext("search", { term: value });
          Sentry.captureException(error instanceof Error ? error : new Error("Course search failed"));
        });
        toast.error("Search failed. Please try again.");
        setSearchResults([]);
      }
    });
  }, []);

  const toggleCourse = useCallback((course: AssignableCourse) => {
    setSelectedCourseIds((current) => {
      if (current.includes(course.id)) {
        return current.filter((id) => id !== course.id);
      }
      return [...current, course.id];
    });
    setSelectedCourseObjs((current) => {
      if (current.some((c) => c.id === course.id)) {
        return current.filter((c) => c.id !== course.id);
      }
      return [...current, course];
    });
  }, []);

  const removeCourse = useCallback((id: string) => {
    setSelectedCourseIds((current) => current.filter((cid) => cid !== id));
    setSelectedCourseObjs((current) => current.filter((c) => c.id !== id));
  }, []);

  useEffect(() => {
    if (state.kind === "success" && state.message) {
      if (state.results) {
        const successCount = state.results.filter(r => r.success).length;
        const failCount = state.results.filter(r => !r.success).length;
        
        if (failCount > 0) {
          toast.warning(`Partial Success`, {
            description: `Assigned ${successCount} courses. ${failCount} failed. Check audit logs for details.`,
          });
        } else {
          toast.success(state.message);
        }
      } else {
        toast.success(state.message);
      }
      
      router.refresh();
      
      const successfulIds = new Set(state.results?.filter(r => r.success).map(r => r.courseId) ?? []);
      
      if (successfulIds.size > 0) {
        setAvailableCourses((current) => current.filter((course) => !successfulIds.has(course.id)));
        setSearchResults((current) =>
          current ? current.filter((course) => !successfulIds.has(course.id)) : current,
        );
      }
      
      setSelectedCourseIds([]);
      setSelectedCourseObjs([]);
      setSelectedTaId("");
      setCourseSearch("");
      setTaSearch("");
    } else if (state.kind === "error" && state.message) {
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
  const canSubmit = canAssign && selectedCourseIds.length > 0 && Boolean(selectedTaId) && !pending;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div>
          <CardTitle className="text-base">Assign TA to Courses</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            First select a staff member, then select one or more courses to assign.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-0">
        <form action={formAction}>
          <input type="hidden" name="courseIds" value={selectedCourseIds.join(",")} />
          <input type="hidden" name="profileId" value={selectedTaId} />

          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">1. Select Staff Member</label>
                <Popover open={taPickerOpen} onOpenChange={setTaPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={pending}
                      className={cn(
                        "h-12 w-full justify-between px-3 text-left",
                        selectedTa && "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                      )}
                    >
                      <div className="flex flex-col items-start truncate">
                        <span className="text-sm font-semibold">
                          {selectedTa ? selectedTa.fullName ?? "Unnamed TA" : "Choose a staff member..."}
                        </span>
                        {selectedTa && (
                          <span className="text-[11px] text-muted-foreground">{selectedTa.email}</span>
                        )}
                      </div>
                      <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-[min(460px,calc(100vw-2rem))] p-0">
                    <div className="border-b p-3">
                      <SearchBar
                        autoFocus
                        value={taSearch}
                        onValueChange={setTaSearch}
                        placeholder="Search TA by name or email..."
                        inputClassName="h-10"
                      />
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
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">2. Select Courses to Assign</label>
                <Popover open={coursePickerOpen} onOpenChange={setCoursePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!selectedTaId || pending}
                      className={cn(
                        "h-12 w-full justify-between px-3 text-left",
                        selectedCourseIds.length > 0 && "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                      )}
                    >
                      <span className="truncate">
                        {selectedCourseIds.length > 0 
                          ? `${selectedCourseIds.length} course${selectedCourseIds.length === 1 ? "" : "s"} selected`
                          : "Choose courses..."}
                      </span>
                      <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
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
                        <SearchBar
                          autoFocus
                          value={courseSearch}
                          onValueChange={setCourseSearch}
                          onSearch={runCourseSearch}
                          debounceMs={SEARCH_DEBOUNCE_MS}
                          loading={isSearching}
                          placeholder="Search by title or ID..."
                          containerClassName="flex-1"
                          inputClassName="h-10"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {isSearching ? "Searching…" : `${courseResultCount.toLocaleString()} matching course${courseResultCount === 1 ? "" : "s"}`}
                        </p>
                        {selectedCourseIds.length > 0 && (
                          <button 
                            type="button" 
                            onClick={() => { setSelectedCourseIds([]); setSelectedCourseObjs([]); }}
                            className="text-[11px] text-primary hover:underline"
                          >
                            Clear all {selectedCourseIds.length}
                          </button>
                        )}
                      </div>
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
                                selectedCourseIds.includes(course.id) && "bg-muted"
                              )}
                              onClick={() => toggleCourse(course)}
                            >
                              <div className={cn(
                                "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border border-primary",
                                selectedCourseIds.includes(course.id) ? "bg-primary text-primary-foreground" : "opacity-50"
                              )}>
                                {selectedCourseIds.includes(course.id) && <Check className="size-3" />}
                              </div>
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
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {selectedCourseObjs.length > 0 && (
              <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selected Courses ({selectedCourseObjs.length})</h4>
                  <button 
                    type="button" 
                    onClick={() => { setSelectedCourseIds([]); setSelectedCourseObjs([]); }}
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    Remove all
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedCourseObjs.map((course) => (
                    <Badge key={course.id} variant="secondary" className="flex items-center gap-1.5 py-1 pl-2.5 pr-1.5 text-[11px] font-medium transition-colors hover:bg-secondary/80">
                      <span className="max-w-[200px] truncate">{course.title}</span>
                      <button
                        type="button"
                        onClick={() => removeCourse(course.id)}
                        className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-4 border-t pt-4">
              <div className="flex-1">
                {selectedTaId && selectedCourseIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Assigning <span className="font-semibold text-foreground">{selectedCourseIds.length}</span> course{selectedCourseIds.length === 1 ? "" : "s"} to <span className="font-semibold text-foreground">{selectedTa?.fullName ?? selectedTa?.email}</span>.
                  </p>
                )}
              </div>
              <Button className="h-11 px-8 font-semibold shadow-sm" disabled={!canSubmit} type="submit">
                {pending ? (
                  <>
                    <LottieLoader className="mr-2 size-4 " />
                    Assigning…
                  </>
                ) : (
                  `Assign ${selectedCourseIds.length || ""} TA`
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
