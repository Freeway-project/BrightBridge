"use client";
import { LottieLoader } from "@/components/ui/lottie-loader"

import { useState, useTransition } from "react";
import { ClipboardList, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveFinalSummaryNotesAction } from "@/lib/courses/final-summary-actions";
import { SummaryNotesRows, parseSummaryRows, joinSummaryRows } from "./summary-notes-rows";

interface Props {
  courseId: string;
  initialNotes: string | null;
  /** When false the summary is shown read-only (admins / wrong status). */
  editable: boolean;
}

/**
 * "Final Summary for Instructor" — the TA's plain-language wrap-up shown to the
 * instructor at sign-off. Authored as an add/remove list of note rows (stored
 * joined into a single text field). Editable by the assigned TA during staging;
 * read-only everywhere else. Renders nothing when read-only and empty.
 */
export function FinalSummaryEditor({ courseId, initialNotes, editable }: Props) {
  const [rows, setRows] = useState<string[]>(() => parseSummaryRows(initialNotes));
  const [savedJoined, setSavedJoined] = useState(() => joinSummaryRows(parseSummaryRows(initialNotes)));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const joined = joinSummaryRows(rows);
  const dirty = joined !== savedJoined;

  function save() {
    if (!dirty) return;
    setError(null);
    startTransition(async () => {
      try {
        await saveFinalSummaryNotesAction(courseId, joined);
        setSavedJoined(joined);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save the summary.");
      }
    });
  }

  if (!editable && !savedJoined.trim()) return null;

  const readonlyRows = parseSummaryRows(savedJoined);

  return (
    <section className="rounded-lg border border-border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <ClipboardList className="size-4 text-primary" aria-hidden />
        <h2 className="text-sm font-semibold">Final Summary for Instructor</h2>
      </div>

      {editable ? (
        <>
          <p className="text-xs text-muted-foreground">
            A short, plain-language wrap-up the instructor will read before signing off. Add one point per row.
          </p>
          <SummaryNotesRows
            rows={rows}
            onChange={setRows}
            disabled={isPending}
            onBlur={save}
            placeholder="Summarise a key outcome or anything the instructor should know…"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground" aria-live="polite">
              {isPending ? (
                <span className="inline-flex items-center gap-1"><LottieLoader className="size-3 " /> Saving…</span>
              ) : error ? (
                <span className="text-destructive">{error}</span>
              ) : dirty ? (
                "Unsaved changes"
              ) : savedJoined.trim() ? (
                <span className="inline-flex items-center gap-1 text-success"><Check className="size-3" /> Saved</span>
              ) : null}
            </span>
            <Button size="sm" variant="outline" disabled={!dirty || isPending} onClick={save}>
              Save summary
            </Button>
          </div>
        </>
      ) : (
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-foreground">
          {readonlyRows.map((row, i) => (
            <li key={i}>{row}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
