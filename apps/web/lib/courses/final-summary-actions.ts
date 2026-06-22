"use server";

import { revalidatePath } from "next/cache";
import { saveFinalSummaryNotes } from "./final-summary";

export async function saveFinalSummaryNotesAction(courseId: string, notes: string): Promise<void> {
  await saveFinalSummaryNotes(courseId, notes);
  revalidatePath(`/courses/${courseId}/issue-log`);
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath(`/instructor/courses/${courseId}`);
}
