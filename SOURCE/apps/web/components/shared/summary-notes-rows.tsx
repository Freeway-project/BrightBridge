"use client";

import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/** Split a stored summary (one note per line) into editable rows. Always ≥1 row. */
export function parseSummaryRows(notes: string | null | undefined): string[] {
  const rows = (notes ?? "")
    .split("\n")
    .map((r) => r.trim())
    .filter(Boolean);
  return rows.length ? rows : [""];
}

/** Join rows back into the single text field stored in courses.instructor_summary_notes. */
export function joinSummaryRows(rows: string[]): string {
  return rows.map((r) => r.trim()).filter(Boolean).join("\n");
}

type Props = {
  rows: string[];
  onChange: (rows: string[]) => void;
  disabled?: boolean;
  onBlur?: () => void;
  placeholder?: string;
};

/**
 * The Final Summary for Instructor as an add/remove list of note rows. Each row
 * is one line; rows are joined into the existing single text column on save.
 */
export function SummaryNotesRows({ rows, onChange, disabled, onBlur, placeholder }: Props) {
  function update(index: number, value: string) {
    const next = [...rows];
    next[index] = value;
    onChange(next);
  }
  function add() {
    onChange([...rows, ""]);
  }
  function remove(index: number) {
    const next = rows.filter((_, i) => i !== index);
    onChange(next.length ? next : [""]);
  }

  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="w-5 shrink-0 text-right text-xs text-muted-foreground">{index + 1}.</span>
          <Input
            value={row}
            disabled={disabled}
            onChange={(e) => update(index, e.target.value)}
            onBlur={onBlur}
            maxLength={500}
            placeholder={placeholder ?? "Add a note…"}
            className="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled || (rows.length === 1 && !row.trim())}
            onClick={() => remove(index)}
            aria-label="Remove note"
            className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
          >
            <X className="size-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={add} className="gap-1.5">
        <Plus className="size-3.5" /> Add note
      </Button>
    </div>
  );
}
