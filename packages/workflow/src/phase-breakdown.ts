import {
  COURSE_STATUS_LABELS,
  COURSE_STATUS_SHORT_LABELS,
  WORKFLOW_PHASES,
  type CourseStatus,
  type PipelineStage,
} from "./statuses";

export type StatusBreakdown = {
  status: CourseStatus;
  label: string;
  shortLabel: string;
  count: number;
};

export type PhaseBreakdown = {
  key: PipelineStage;
  label: string;
  total: number;
  statuses: StatusBreakdown[];
};

/**
 * Buckets per-status counts into the canonical WORKFLOW_PHASES (one entry per
 * status, every status present — so no status is ever dropped from the totals).
 */
export function getPhaseBreakdown(
  countByStatus: Partial<Record<CourseStatus, number>>,
): PhaseBreakdown[] {
  return WORKFLOW_PHASES.map((phase) => {
    const statuses: StatusBreakdown[] = phase.groups.map((group) => {
      const status = group.statuses[0]!; // statusGroup() always creates a 1-element array
      return {
        status,
        label: COURSE_STATUS_LABELS[status],
        shortLabel: COURSE_STATUS_SHORT_LABELS[status],
        count: countByStatus[status] ?? 0,
      };
    });
    return {
      key: phase.key,
      label: phase.label,
      total: statuses.reduce((sum, s) => sum + s.count, 0),
      statuses,
    };
  });
}
