"use client";

import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Info, Search } from "lucide-react";
import { useStickyTabState } from "@/hooks/use-sticky-tab-state";
import { BatchExportPanel } from "./batch-export-panel";
import { SentCoursesTable } from "./sent-courses-table";
import type { ReadyForInstructorCourse, SentToInstructorCourse } from "@/lib/admin/queries";


const SEND_PANEL_TAB_COPY = {
  ready: {
    label: "Ready for Instructor",
    helper: "Queued, not emailed yet",
    tooltip: "Courses in ready_for_instructor with an assigned instructor. These are ready to send now.",
  },
  sent: {
    label: "Instructor Review",
    helper: "Already sent or under review",
    tooltip: "Courses already in the instructor phase: sent_to_instructor, instructor_viewing, instructor_questions, or instructor_approved.",
  },
  all: {
    label: "Combined View",
    helper: "Show both sections",
    tooltip: "Displays both the ready queue and the instructor review list together.",
  },
} as const;

function SendPanelTab({
  value,
  count,
}: {
  value: keyof typeof SEND_PANEL_TAB_COPY;
  count: number;
}) {
  const copy = SEND_PANEL_TAB_COPY[value];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <TabsTrigger
          value={value}
          className="h-auto min-h-14 items-start justify-start px-4 py-2.5 text-left data-[state=active]:bg-muted/30"
        >
          <span className="flex items-center gap-2 text-sm font-semibold md:text-[15px]">
            <span>{copy.label}</span>
            {count > 0 && (
              <span className="rounded-full bg-muted px-1.5 py-0 text-[10px] font-semibold text-muted-foreground">
                {count}
              </span>
            )}
            <Info className="size-3.5 text-muted-foreground" aria-hidden />
          </span>
          <span className="text-xs font-medium text-muted-foreground md:text-[13px]">
            {copy.helper}
          </span>
        </TabsTrigger>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6} className="max-w-sm leading-relaxed">
        {copy.tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

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
        <div className="w-full border-b border-border sm:w-auto sm:border-b-0">
          <TabsList variant="line" className="h-auto w-full flex-wrap justify-start gap-2 sm:w-fit">
            <SendPanelTab value="ready" count={filteredReady.length} />
            <SendPanelTab value="sent" count={filteredSent.length} />
            <SendPanelTab value="all" count={totalCount} />
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
