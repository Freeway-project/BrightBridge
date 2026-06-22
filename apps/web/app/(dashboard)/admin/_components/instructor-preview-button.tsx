"use client";

import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { generateInstructorPreviewLinkAction } from "../actions";

type Props = {
  courseId: string;
  instructorEmail: string;
};

export function InstructorPreviewButton({ courseId, instructorEmail }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const url = await generateInstructorPreviewLinkAction(courseId, instructorEmail);
      // Copy to clipboard so admin can open in incognito if preferred
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        // clipboard not available — proceed silently
      }
      window.open(url, "_blank", "noopener,noreferrer");
      toast.info("Instructor link opened in new tab — also copied to clipboard. Open in incognito to avoid losing your admin session.");
    } catch (err) {
      console.error("[InstructorPreviewButton]", err);
      toast.error("Could not generate instructor preview link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        <ExternalLink className="size-3" />
      )}
      View
    </Button>
  );
}
