"use client";
import { LottieLoader } from "@/components/ui/lottie-loader"

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Check, ChevronsUpDown, UserPlus } from "lucide-react";
import { createInstructorAndAssignAction, searchCoursesForInstructorAction, type AssignTaState } from "../actions";

type AssignableCourse = {
  id: string;
  title: string;
  sourceCourseId: string | null;
};

type InstructorAssignmentPanelProps = {
  courses: AssignableCourse[];
};

const initialState: AssignTaState = {
  kind: "idle",
  message: null,
};

const MAX_VISIBLE_COURSES = 250;
const SEARCH_DEBOUNCE_MS = 300;

export function InstructorAssignmentPanel({ courses }: InstructorAssignmentPanelProps) {
  const [state, formAction, pending] = useActionState(createInstructorAndAssignAction, initialState);
  const [coursePickerOpen, setCoursePickerOpen] = useState(false);
  const [courseSearch, setCourseSearch] = useState("");
  const [courseYear, setCourseYear] = useState<string>("all");
  const [courseTerm, setCourseTerm] = useState<string>("all");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedCourseObj, setSelectedCourseObj] = useState<AssignableCourse | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [searchResults, setSearchResults] = useState<AssignableCourse[] | null>(null);
  const [isSearching, startSearch] = useTransition();

  const activeCourseList = courseSearch.trim() ? (searchResults ?? []) : courses;

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
          courses.find((course) => course.id === selectedCourseId) ?? null,
    [filteredCourseList, courses, selectedCourseId]
  );

  const runCourseSearch = (value: string) => {
    if (!value) {
      setSearchResults(null);
      return;
    }
    startSearch(async () => {
      const results = await searchCoursesForInstructorAction(value);
      setSearchResults(results);
    });
  };

  useEffect(() => {
    if (state.kind === "success" && state.message) {
      toast.success(state.message);
      setSelectedCourseId("");
      setSelectedCourseObj(null);
      setFullName("");
      setEmail("");
    } else if (state.kind === "error" && state.message) {
      toast.error(state.message);
    }
  }, [state]);

  const visibleCourses = useMemo(
    () => filteredCourseList.slice(0, MAX_VISIBLE_COURSES),
    [filteredCourseList]
  );

  const canSubmit = Boolean(selectedCourseId) && Boolean(fullName.trim()) && Boolean(email.trim()) && !pending;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Create & Assign Instructor</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a new instructor profile and assign them to a course in one step.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-0">
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="courseId" value={selectedCourseId} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground">Instructor Full Name</label>
              <Input
                name="fullName"
                placeholder="e.g. Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={pending}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground">Instructor Email</label>
              <Input
                name="email"
                type="email"
                placeholder="jane.doe@example.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={pending}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground">Course to Assign</label>
            <Popover open={coursePickerOpen} onOpenChange={setCoursePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  className="h-10 w-full justify-between px-3"
                >
                  <span className="truncate text-left">
                    {selectedCourseObj ? selectedCourseObj.title : "Select a course..."}
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
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex justify-end pt-2">
            <Button className="h-10 w-full sm:w-auto" disabled={!canSubmit} type="submit">
              {pending ? (
                <>
                  <LottieLoader className="mr-2 size-4 " />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 size-4" />
                  Create & Assign Instructor
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
