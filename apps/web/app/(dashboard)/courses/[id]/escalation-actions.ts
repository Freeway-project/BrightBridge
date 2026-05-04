"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth/context";
import { createEscalation, addEscalationMessage } from "@/lib/services/escalations";
import type { EscalationSeverity } from "@/lib/repositories/contracts";

export async function createEscalationAction(
  courseId: string,
  severity: EscalationSeverity,
  title: string,
  firstMessage: string,
) {
  const ctx = await requireProfile();
  try {
    const escalation = await createEscalation({
      courseId,
      createdBy: ctx.userId,
      severity,
      title,
      firstMessage,
    });
    revalidatePath(`/courses/${courseId}`);
    revalidatePath(`/admin/courses/${courseId}`);
    return escalation;
  } catch (err) {
    console.error("[escalation] createEscalationAction:", err);
    throw new Error("Could not submit escalation. Please ensure the database migration has been applied.");
  }
}

export async function sendEscalationMessageAction(
  courseId: string,
  escalationId: string,
  body: string,
) {
  const ctx = await requireProfile();
  try {
    const message = await addEscalationMessage(escalationId, ctx.userId, body.trim());
    revalidatePath(`/courses/${courseId}`);
    revalidatePath(`/admin/courses/${courseId}`);
    return message;
  } catch (err) {
    console.error("[escalation] sendEscalationMessageAction:", err);
    throw new Error("Could not send message. Please ensure the database migration has been applied.");
  }
}
