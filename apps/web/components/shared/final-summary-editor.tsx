"use client";
import { LottieLoader } from "@/components/ui/lottie-loader"

import { useState, useTransition } from "react";
import { ClipboardList, Check } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { saveFinalSummaryNotesAction } from "@/lib/courses/final-summary-actions";
import { cn } from "@/lib/utils";

interface Props {
  courseId: string;
  initialNotes: string | null;
  /** When false the summary is shown read-only (admins / wrong status). */
  editable: boolean;
}

/**
 * "Final Summary for Instructor" — the TA's plain-language wrap-up shown to the
 * instructor at sign-off. Editable by the assigned TA during staging; read-only
 * everywhere else. Renders nothing when read-only and empty.
 */
export function FinalSummaryEditor({ courseId, initialNotes, editable }: Props) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [savedNotes, setSavedNotes] = useState(initialNotes ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const dirty = notes.trim() !== savedNotes.trim();

  function save() {
    if (!dirty) return;
    setError(null);
    startTransition(async () => {
      try {
        await saveFinalSummaryNotesAction(courseId, notes);
        setSavedNotes(notes);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save the summary.");
      }
    });
  }

  if (!editable && !savedNotes.trim()) return null;

  return (
    <section className="rounded-lg border border-border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <ClipboardList className="size-4 text-primary" aria-hidden />
        <h2 className="text-sm font-semibold">Final Summary for Instructor</h2>
      </div>

      {editable ? (
        <>
          <p className="text-xs text-muted-foreground">
            A short, plain-language wrap-up the instructor will read before signing off.
          </p>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={save}
            rows={5}
            maxLength={5000}
            placeholder="Summarise the key outcomes and anything the instructor should know…"
            className="resize-y"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground" aria-live="polite">
              {isPending ? (
                <span className="inline-flex items-center gap-1"><LottieLoader className="size-3 " /> Saving…</span>
              ) : error ? (
                <span className="text-destructive">{error}</span>
              ) : dirty ? (
                "Unsaved changes"
              ) : savedNotes.trim() ? (
                <span className="inline-flex items-center gap-1 text-success"><Check className="size-3" /> Saved</span>
              ) : null}
            </span>
            <Button size="sm" variant="outline" disabled={!dirty || isPending} onClick={save}>
              Save summary
            </Button>
          </div>
        </>
      ) : (
        <p className={cn("text-sm whitespace-pre-wrap leading-relaxed text-foreground")}>{savedNotes}</p>
      )}
    </section>
  );
}
