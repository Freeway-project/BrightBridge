"use server";

import { getCourseChatInbox } from "@/lib/services/course-chat";
import type { CourseChatInboxItem } from "@/lib/repositories/contracts";

export async function getCourseChatInboxAction(): Promise<CourseChatInboxItem[]> {
  return getCourseChatInbox();
}
