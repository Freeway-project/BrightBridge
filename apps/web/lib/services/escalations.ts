import "server-only";

import { getEscalationRepository } from "@/lib/repositories";
import type {
  CreateEscalationInput,
  EscalationWithMessages,
  EscalationMessage,
  OpenEscalationRow,
} from "@/lib/repositories/contracts";

export type { EscalationWithMessages, EscalationMessage, OpenEscalationRow } from "@/lib/repositories/contracts";

export async function getEscalationsForCourse(courseId: string): Promise<EscalationWithMessages[]> {
  try {
    return await getEscalationRepository().getEscalationsForCourse(courseId);
  } catch {
    return [];
  }
}

export async function getOpenEscalations(): Promise<OpenEscalationRow[]> {
  try {
    return await getEscalationRepository().getOpenEscalations();
  } catch {
    return [];
  }
}

export async function countOpenEscalations(): Promise<number> {
  try {
    return await getEscalationRepository().countOpenEscalations();
  } catch {
    return 0;
  }
}

export async function createEscalation(input: CreateEscalationInput): Promise<EscalationWithMessages> {
  return getEscalationRepository().createEscalation(input);
}

export async function addEscalationMessage(
  escalationId: string,
  authorId: string,
  body: string,
): Promise<EscalationMessage> {
  return getEscalationRepository().addMessage(escalationId, authorId, body);
}

export async function resolveEscalation(escalationId: string, resolvedBy: string): Promise<void> {
  return getEscalationRepository().resolveEscalation(escalationId, resolvedBy);
}
