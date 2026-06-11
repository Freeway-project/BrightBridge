"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./status-badge";
import { SectionProgressBar } from "./section-progress-bar";
import { type CourseStatus, getBallInCourt } from "@coursebridge/workflow";
import { motion } from "framer-motion";
import { ArrowRight, Play, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ReviewProgress } from "@/lib/courses/service";

interface CourseCardProps {
  course: {
    id: string;
    sourceCourseId: string | null;
    title: string;
    term: string | null;
    department: string | null;
    status: CourseStatus;
    updatedAt: string;
    reviewProgress?: ReviewProgress;
  };
  issueCounts?: { open: number; resolved: number };
  index?: number;
}

export function CourseCard({ course, issueCounts, index = 0 }: CourseCardProps) {
  const { action, ownerLabel, ownerIsYou } = deriveAction(course.status);
  const lastTouched = relativeTime(course.updatedAt);
  const open = issueCounts?.open ?? 0;
  const resolved = issueCounts?.resolved ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: [0.23, 1, 0.32, 1] }}
    >
      <Link
        href={`/courses/${course.id}/metadata`}
        className="block focus:outline-none"
        aria-label={`${course.sourceCourseId ?? "NO-CODE"} ${course.title} — ${action}`}
      >
        <Card
          className={cn(
            "group/card relative overflow-hidden border border-border/60 bg-card p-5 transition-all duration-200",
            "hover:-translate-y-0.5 hover:border-accent-indigo/40",
            "hover:shadow-[0_0_24px_var(--accent-indigo-glow)]",
            "focus-within:ring-2 focus-within:ring-accent-indigo/50",
          )}
        >
          <div className="space-y-3">
            {/* Row 1: identity */}
            <div className="flex items-baseline justify-between gap-3">
              <div className="flex min-w-0 items-baseline gap-2">
                <span className="font-mono text-xs font-medium text-muted-foreground/70">
                  {course.sourceCourseId ?? "NO-CODE"}
                </span>
                <span className="truncate text-base font-semibold text-foreground">
                  {course.title}
                </span>
                {course.term && (
                  <span className="text-xs text-muted-foreground/60">· {course.term}</span>
                )}
              </div>
              <StatusBadge status={course.status} className="h-5 shrink-0" />
            </div>

            {/* Row 2: action — the hero */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Play className="size-4 fill-current text-accent-indigo" />
                <span className="relative text-sm font-medium text-foreground">
                  {action}
                  <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-accent-indigo transition-transform duration-200 group-hover/card:scale-x-100" />
                </span>
              </div>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                  ownerIsYou
                    ? "bg-accent-indigo-soft text-accent-indigo"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {ownerIsYou ? "YOU" : ownerLabel}
              </span>
            </div>

            {/* Row 3: progress strip */}
            <SectionProgressBar progress={course.reviewProgress} />

            {/* Row 4: meta + CTA */}
            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                {open > 0 && (
                  <span className="inline-flex items-center gap-1 text-status-danger">
                    <AlertCircle className="size-3" />
                    {open} {open === 1 ? "issue" : "issues"}
                  </span>
                )}
                <span>last touched {lastTouched}</span>
                {resolved > 0 && (
                  <span className="inline-flex items-center gap-1 text-status-success/80">
                    <CheckCircle2 className="size-3" />
                    {resolved}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs text-accent-indigo hover:bg-accent-indigo-soft hover:text-accent-indigo-hover"
                asChild
              >
                <span>
                  Open
                  <ArrowRight className="size-3 transition-transform group-hover/card:translate-x-0.5" />
                </span>
              </Button>
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}

function deriveAction(status: CourseStatus): {
  action: string;
  ownerLabel: string;
  ownerIsYou: boolean;
} {
  const ball = getBallInCourt(status);
  const ownerIsYou = ball === "staff";

  let action: string;
  let ownerLabel: string;

  switch (status) {
    case "course_created":
      action = "Awaiting reviewer assignment";
      ownerLabel = "ADMIN";
      break;
    case "assigned_to_ta":
      action = "Start TA review";
      ownerLabel = "YOU";
      break;
    case "ta_review_in_progress":
      action = "Continue your review";
      ownerLabel = "YOU";
      break;
    case "submitted_to_admin":
      action = "Awaiting admin review";
      ownerLabel = "ADMIN";
      break;
    case "admin_changes_requested":
      action = "Address requested changes";
      ownerLabel = "YOU";
      break;
    case "waiting_on_admin":
      action = "Awaiting staging shell";
      ownerLabel = "ADMIN";
      break;
    case "staging_in_progress":
      action = "Finalize the course";
      ownerLabel = "YOU";
      break;
    case "ready_for_instructor":
      action = "Awaiting send to instructor";
      ownerLabel = "ADMIN";
      break;
    case "sent_to_instructor":
    case "instructor_viewing":
      action = "With the instructor";
      ownerLabel = "INSTRUCTOR";
      break;
    case "instructor_questions":
      action = "Awaiting admin response";
      ownerLabel = "ADMIN";
      break;
    case "instructor_approved":
      action = "Awaiting final approval";
      ownerLabel = "ADMIN";
      break;
    case "final_approved":
      action = "Completed";
      ownerLabel = "DONE";
      break;
    default:
      action = "Review status";
      ownerLabel = ball.toUpperCase();
  }

  return { action, ownerLabel, ownerIsYou };
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days === 0) {
    const hours = Math.floor(ms / 3_600_000);
    if (hours === 0) return "just now";
    return `${hours}h ago`;
  }
  if (days === 1) return "1d ago";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
