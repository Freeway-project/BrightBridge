"use server";

import {
  getAccessibleCourseAggregates,
  getAccessibleCoursesPage,
  type AccessibleCourseListInput,
} from "@/lib/courses/service";
import type {
  AccessibleCourseAggregates,
  CourseSummary,
  PaginatedResult,
} from "@/lib/repositories/contracts";

export async function loadAccessibleCoursesPageAction(
  input: AccessibleCourseListInput,
): Promise<PaginatedResult<CourseSummary>> {
  return getAccessibleCoursesPage(input);
}

export async function loadAccessibleCourseAggregatesAction(
  input: Pick<AccessibleCourseListInput, "search" | "subject" | "term">,
): Promise<AccessibleCourseAggregates> {
  return getAccessibleCourseAggregates(input);
}
