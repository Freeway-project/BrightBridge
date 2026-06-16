"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { batchExportAndSendAction, type BatchMailMergeRow } from "../actions";
import type { ReadyForInstructorCourse } from "@/lib/admin/queries";

type AccessState = {
  accessCount: number;
  firstAccessedAt: string | null;
};

function buildCsv(rows: BatchMailMergeRow[]): string {
  const header = [
    "Instructor Name",
    "Instructor Email",
    "Course Title",
    "Moodle URL",
    "Brightspace URL",
    "Magic Link",
  ];
  const escape = (v: string) => {
    const s = v.replace(/\r?\n/g, " ");
    return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    header,
    ...rows.map((r) => [
      r.instructorName,
      r.instructorEmail,
      r.courseTitle,
      r.moodleUrl,
      r.brightspaceUrl,
      r.magicLink,
    ]),
  ]
    .map((cells) => cells.map(escape).join(","))
    .join("\n");
}

function downloadCsv(rows: BatchMailMergeRow[]) {
  const blob = new Blob([buildCsv(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `coursebridge-instructor-batch-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

type Props = {
  courses: ReadyForInstructorCourse[];
};

export function BatchExportPanel({ courses }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [accessMap, setAccessMap] = useState<Record<string, AccessState>>({});

  const allSelected = courses.length > 0 && selectedIds.size === courses.length;

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(courses.map((c) => c.courseId)));
  }

  function toggleOne(courseId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(courseId) ? next.delete(courseId) : next.add(courseId);
      return next;
    });
  }

  function handleExport() {
    const ids = Array.from(selectedIds);
    startTransition(async () => {
      try {
        const result = await batchExportAndSendAction(ids);
        if (result.rows.length > 0) {
          downloadCsv(result.rows);
          toast.success(
            result.skipped > 0
              ? `Exported ${result.rows.length} course${result.rows.length !== 1 ? "s" : ""}, skipped ${result.skipped} (no instructor assigned).`
              : `Exported ${result.rows.length} course${result.rows.length !== 1 ? "s" : ""}.`,
          );
          setSelectedIds(new Set());
        } else {
          toast.error(
            result.skipped > 0
              ? `All ${result.skipped} selected courses were skipped — check instructor assignments.`
              : "No courses exported.",
          );
        }
      } catch {
        toast.error("Export failed. Please try again.");
      }
    });
  }

  // Supabase Realtime: watch for access_count changes on review_invites
  useEffect(() => {
    if (courses.length === 0) return;

    const supabase = createClient();
    const channel = supabase
      .channel("batch-invite-access")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "review_invites",
        },
        (payload: { new: { course_id: string; access_count: number; first_accessed_at: string | null } }) => {
          const updated = payload.new;
          setAccessMap((prev) => ({
            ...prev,
            [updated.course_id]: {
              accessCount: updated.access_count,
              firstAccessedAt: updated.first_accessed_at,
            },
          }));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [courses.length]);

  if (courses.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No courses are currently in &quot;Ready for Instructor&quot; status.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ready for Instructor</CardTitle>
          <p className="text-sm text-muted-foreground">
            Select courses to export a mail-merge CSV with never-expiring magic links. All selected
            courses will be marked <strong>Sent to Instructor</strong>.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="w-10 px-4 py-2">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Course</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Instructor</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Link Status</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => {
                  const access = accessMap[course.courseId];
                  return (
                    <tr
                      key={course.courseId}
                      className="border-b border-border last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-2.5">
                        <Checkbox
                          checked={selectedIds.has(course.courseId)}
                          onCheckedChange={() => toggleOne(course.courseId)}
                          aria-label={`Select ${course.courseTitle}`}
                        />
                      </td>
                      <td className="px-4 py-2.5 font-medium">
                        <a
                          href={`/admin/courses/${course.courseId}`}
                          className="hover:underline"
                        >
                          {course.courseTitle}
                        </a>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {course.instructorName ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{course.instructorEmail}</td>
                      <td className="px-4 py-2.5">
                        {access && access.accessCount > 0 ? (
                          <Badge variant="secondary" className="text-xs font-normal">
                            Opened {access.accessCount}×
                            {access.firstAccessedAt
                              ? ` · first ${new Date(access.firstAccessedAt).toLocaleDateString()}`
                              : ""}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not yet opened</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {selectedIds.size > 0 && (
        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-4 rounded-lg border border-amber-400/40 bg-amber-500/10 px-4 py-2.5 backdrop-blur">
          <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
            {selectedIds.size} course{selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setSelectedIds(new Set())}
              disabled={isPending}
            >
              Clear
            </Button>
            <Button
              size="sm"
              className="h-7 gap-1.5 bg-amber-600 text-white hover:bg-amber-700 text-xs"
              onClick={handleExport}
              disabled={isPending}
            >
              {isPending ? (
                "Preparing CSV…"
              ) : (
                <>
                  <Send className="size-3" />
                  Export CSV &amp; Send to Instructor
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
