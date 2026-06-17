"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useStickyTabState } from "@/hooks/use-sticky-tab-state";
import { BatchExportPanel } from "./batch-export-panel";
import { SentCoursesTable } from "./sent-courses-table";
import type { ReadyForInstructorCourse, SentToInstructorCourse } from "@/lib/admin/queries";

type Props = {
  readyCourses: ReadyForInstructorCourse[];
  sentCourses: SentToInstructorCourse[];
};

export function SendPanel({ readyCourses, sentCourses }: Props) {
  const [tab, setTab] = useStickyTabState("send-panel", "ready");

  return (
    <Tabs value={tab} onValueChange={setTab} className="flex min-w-0 flex-col gap-4">
      <div className="border-b border-border w-full">
        <TabsList variant="line" className="h-auto w-full flex-wrap justify-start gap-y-1 sm:w-fit">
          <TabsTrigger value="ready">
            Ready to Send
            {readyCourses.length > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-500/20 px-1.5 py-0 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                {readyCourses.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent">
            Sent to Instructor
            {sentCourses.length > 0 && (
              <span className="ml-1.5 rounded-full bg-blue-500/20 px-1.5 py-0 text-[10px] font-semibold text-blue-700 dark:text-blue-300">
                {sentCourses.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="ready">
        <BatchExportPanel courses={readyCourses} />
      </TabsContent>

      <TabsContent value="sent">
        <SentCoursesTable courses={sentCourses} />
      </TabsContent>
    </Tabs>
  );
}
