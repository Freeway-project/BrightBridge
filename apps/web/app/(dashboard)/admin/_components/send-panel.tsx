"use client";

import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useStickyTabState } from "@/hooks/use-sticky-tab-state";
import { BatchExportPanel } from "./batch-export-panel";
import { SentCoursesTable } from "./sent-courses-table";
import type { ReadyForInstructorCourse, SentToInstructorCourse } from "@/lib/admin/queries";

type Props = {
  readyCourses: ReadyForInstructorCourse[];
  sentCourses: SentToInstructorCourse[];
  /** When true (admin_viewer), the export/send controls are hidden. */
  readOnly?: boolean;
};

/** Case-insensitive match on course title, instructor name, or instructor email. */
function matchesQuery(
  query: string,
  title: string,
  name: string | null,
  email: string | null,
): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    title.toLowerCase().includes(q) ||
    (name?.toLowerCase().includes(q) ?? false) ||
    (email?.toLowerCase().includes(q) ?? false)
  );
}

export function SendPanel({ readyCourses, sentCourses, readOnly = false }: Props) {
  const [tab, setTab] = useStickyTabState("send-panel", "ready");
  const [query, setQuery] = useState("");

  const filteredReady = useMemo(
    () => readyCourses.filter((c) => matchesQuery(query, c.courseTitle, c.instructorName, c.instructorEmail)),
    [readyCourses, query],
  );
  const filteredSent = useMemo(
    () => sentCourses.filter((c) => matchesQuery(query, c.courseTitle, c.instructorName, c.instructorEmail)),
    [sentCourses, query],
  );
  const totalCount = filteredReady.length + filteredSent.length;

  return (
    <Tabs value={tab} onValueChange={setTab} className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="border-b border-border w-full sm:w-auto sm:border-b-0">
          <TabsList variant="line" className="h-auto w-full flex-wrap justify-start gap-y-1 sm:w-fit">
            <TabsTrigger value="ready">
              Ready to Send
              {filteredReady.length > 0 && (
                <span className="ml-1.5 rounded-full bg-amber-500/20 px-1.5 py-0 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                  {filteredReady.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent">
              Sent to Instructor
              {filteredSent.length > 0 && (
                <span className="ml-1.5 rounded-full bg-blue-500/20 px-1.5 py-0 text-[10px] font-semibold text-blue-700 dark:text-blue-300">
                  {filteredSent.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">
              All
              {totalCount > 0 && (
                <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0 text-[10px] font-semibold text-muted-foreground">
                  {totalCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search course or instructor…"
            className="h-9 pl-8 text-sm"
            aria-label="Search courses"
          />
        </div>
      </div>

      <TabsContent value="ready">
        <BatchExportPanel courses={filteredReady} readOnly={readOnly} />
      </TabsContent>

      <TabsContent value="sent">
        <SentCoursesTable courses={filteredSent} />
      </TabsContent>

      <TabsContent value="all" className="space-y-6">
        <BatchExportPanel courses={filteredReady} readOnly={readOnly} />
        <SentCoursesTable courses={filteredSent} />
      </TabsContent>
    </Tabs>
  );
}
