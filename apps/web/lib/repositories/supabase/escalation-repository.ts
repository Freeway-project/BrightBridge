import "server-only";

import type {
  CourseEscalation,
  CreateEscalationInput,
  EscalationMessage,
  EscalationRepository,
  EscalationWithMessages,
  OpenEscalationRow,
} from "@/lib/repositories/contracts";
import { getSupabaseAdminClientOrThrow } from "./shared";

type RawMessage = {
  id: string;
  escalation_id: string;
  author_id: string;
  body: string;
  created_at: string;
  profiles?: { full_name?: string | null; email?: string | null } | null;
};

type RawEscalation = {
  id: string;
  course_id: string;
  created_by: string;
  severity: string;
  title: string;
  status: string;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  profiles?: { full_name?: string | null; email?: string | null } | null;
  escalation_messages?: RawMessage[];
};

function mapMessage(row: RawMessage): EscalationMessage {
  return {
    id: row.id,
    escalation_id: row.escalation_id,
    author_id: row.author_id,
    author_name: row.profiles?.full_name ?? undefined,
    author_email: row.profiles?.email ?? undefined,
    body: row.body,
    created_at: row.created_at,
  };
}

function mapEscalation(row: RawEscalation, messages: EscalationMessage[]): EscalationWithMessages {
  return {
    id: row.id,
    course_id: row.course_id,
    created_by: row.created_by,
    severity: row.severity as CourseEscalation["severity"],
    title: row.title,
    status: row.status as CourseEscalation["status"],
    resolved_by: row.resolved_by,
    resolved_at: row.resolved_at,
    created_at: row.created_at,
    author_name: row.profiles?.full_name ?? undefined,
    author_email: row.profiles?.email ?? undefined,
    messages,
  };
}

export function createSupabaseEscalationRepository(): EscalationRepository {
  return {
    async getEscalationsForCourse(courseId) {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("course_escalations")
        .select(`
          *,
          profiles:created_by ( full_name, email ),
          escalation_messages (
            *,
            profiles:author_id ( full_name, email )
          )
        `)
        .eq("course_id", courseId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data ?? []).map((row) => {
        const r = row as unknown as RawEscalation;
        const messages = (r.escalation_messages ?? []).map(mapMessage);
        messages.sort((a, b) => a.created_at.localeCompare(b.created_at));
        return mapEscalation(r, messages);
      });
    },

    async getOpenEscalations() {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("course_escalations")
        .select(`
          *,
          profiles:created_by ( full_name, email ),
          courses:course_id ( title, source_course_id ),
          escalation_messages ( body, created_at )
        `)
        .eq("status", "open")
        .order("created_at", { ascending: true });

      if (error) throw error;

      return (data ?? []).map((row) => {
        const r = row as unknown as RawEscalation & {
          courses?: { title?: string | null; source_course_id?: string | null } | null;
          escalation_messages?: { body: string; created_at: string }[];
        };

        const msgs = (r.escalation_messages ?? []).sort((a, b) =>
          b.created_at.localeCompare(a.created_at),
        );

        return {
          id: r.id,
          course_id: r.course_id,
          created_by: r.created_by,
          severity: r.severity as CourseEscalation["severity"],
          title: r.title,
          status: r.status as CourseEscalation["status"],
          resolved_by: r.resolved_by,
          resolved_at: r.resolved_at,
          created_at: r.created_at,
          author_name: r.profiles?.full_name ?? undefined,
          author_email: r.profiles?.email ?? undefined,
          course_title: r.courses?.title ?? "",
          course_source_id: r.courses?.source_course_id ?? null,
          latest_message: msgs[0]?.body ?? null,
          latest_message_at: msgs[0]?.created_at ?? null,
        } satisfies OpenEscalationRow;
      });
    },

    async createEscalation(input: CreateEscalationInput) {
      const admin = getSupabaseAdminClientOrThrow();

      const { data: esc, error: escErr } = await admin
        .from("course_escalations")
        .insert({
          course_id: input.courseId,
          created_by: input.createdBy,
          severity: input.severity,
          title: input.title,
        })
        .select(`*, profiles:created_by ( full_name, email )`)
        .single();

      if (escErr) throw escErr;

      const { data: msg, error: msgErr } = await admin
        .from("escalation_messages")
        .insert({
          escalation_id: esc.id,
          author_id: input.createdBy,
          body: input.firstMessage,
        })
        .select(`*, profiles:author_id ( full_name, email )`)
        .single();

      if (msgErr) throw msgErr;

      return mapEscalation(esc as unknown as RawEscalation, [
        mapMessage(msg as unknown as RawMessage),
      ]);
    },

    async addMessage(escalationId, authorId, body) {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("escalation_messages")
        .insert({ escalation_id: escalationId, author_id: authorId, body })
        .select(`*, profiles:author_id ( full_name, email )`)
        .single();

      if (error) throw error;
      return mapMessage(data as unknown as RawMessage);
    },

    async resolveEscalation(escalationId, resolvedBy) {
      const admin = getSupabaseAdminClientOrThrow();
      const { error } = await admin
        .from("course_escalations")
        .update({ status: "resolved", resolved_by: resolvedBy, resolved_at: new Date().toISOString() })
        .eq("id", escalationId);

      if (error) throw error;
    },

    async countOpenEscalations() {
      const admin = getSupabaseAdminClientOrThrow();
      const { count, error } = await admin
        .from("course_escalations")
        .select("id", { count: "exact", head: true })
        .eq("status", "open");

      if (error) return 0;
      return count ?? 0;
    },
  };
}
