import { cn } from "@/lib/utils";
import type { ReviewProgress } from "@/lib/courses/service";

type SectionState = "not_started" | "in_progress" | "submitted";

function stateOf(section: ReviewProgress["courseMetadata"] | undefined): SectionState {
  if (!section?.exists) return "not_started";
  if (section.status === "submitted") return "submitted";
  return "in_progress";
}

interface Props {
  progress?: ReviewProgress;
}

const BAR_CLASS: Record<SectionState, string> = {
  not_started: "bg-border/40",
  in_progress: "bg-status-info w-[40%]",
  submitted: "bg-status-success w-full",
};

const SECTIONS = [
  { key: "metadata", label: "Metadata" },
  { key: "matrix", label: "Matrix" },
  { key: "syllabus", label: "Syllabus" },
] as const;

export function SectionProgressBar({ progress }: Props) {
  const states: Record<(typeof SECTIONS)[number]["key"], SectionState> = {
    metadata: stateOf(progress?.courseMetadata),
    matrix: stateOf(progress?.reviewMatrix),
    syllabus: stateOf(progress?.syllabusReview),
  };

  return (
    <div className="grid grid-cols-3 gap-3" aria-label="Section progress">
      {SECTIONS.map((s) => {
        const state = states[s.key];
        return (
          <div key={s.key} className="space-y-1">
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-border/40"
              aria-label={`${s.label}: ${state.replace("_", " ")}`}
            >
              {state !== "not_started" && (
                <div className={cn("h-full rounded-full transition-all duration-500", BAR_CLASS[state])} />
              )}
            </div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
              {s.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
