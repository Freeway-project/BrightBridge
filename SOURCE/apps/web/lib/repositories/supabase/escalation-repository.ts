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

type RawComment = {
  id: string;
  issue_id: string;
  author_id: string;
  body: string;
  created_at: string;
  profiles?: { full_name?: string | null; email?: string | null } | null;
};

type RawIssue = {
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
  course_issue_comments?: RawComment[];
};

function mapComment(row: RawComment): EscalationMessage {
  return {
    id: row.id,
    escalation_id: row.issue_id,
    author_id: row.author_id,
    author_name: row.profiles?.full_name ?? undefined,
    author_email: row.profiles?.email ?? undefined,
    body: row.body,
    created_at: row.created_at,
  };
}

function mapIssue(row: RawIssue, messages: EscalationMessage[], resolutionNote?: string | null): EscalationWithMessages {
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
    resolutionNote: resolutionNote ?? null,
    messages,
  };
}

export function createSupabaseEscalationRepository(): EscalationRepository {
  return {
    async getEscalationsForCourse(courseId) {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("course_issues")
        .select(`
          *,
          profiles:created_by ( full_name, email ),
          course_issue_comments (
            *,
            profiles:author_id ( full_name, email )
          )
        `)
        .eq("course_id", courseId)
        .eq("type", "escalation")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data ?? []).map((row) => {
        const r = row as unknown as RawIssue;
        const allComments = r.course_issue_comments ?? [];
        const messages = allComments
          .filter((c) => !(c as any).is_system_message)
          .map(mapComment);
        messages.sort((a, b) => a.created_at.localeCompare(b.created_at));
        const systemNotes = allComments
          .filter((c) => (c as any).is_system_message)
          .sort((a, b) => b.created_at.localeCompare(a.created_at));
        const resolutionNote = systemNotes[0]?.body ?? null;
        return mapIssue(r, messages, resolutionNote);
      });
    },

    async getOpenEscalations() {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("course_issues")
        .select(`
          id,
          course_id,
          created_by,
          severity,
          title,
          status,
          resolved_by,
          resolved_at,
          created_at,
          profiles:created_by ( full_name, email ),
          courses:course_id ( title, source_course_id ),
          course_issue_comments ( body, created_at )
        `)
        .eq("type", "escalation")
        .eq("status", "open")
        .order("created_at", { ascending: true });

      if (error) throw error;

      return (data ?? []).map((row) => {
        const r = row as unknown as {
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
          courses?: { title?: string | null; source_course_id?: string | null } | null;
          course_issue_comments?: { body: string; created_at: string }[];
        };

        const msgs = (r.course_issue_comments ?? []).sort((a, b) =>
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

      const { data: issue, error: issueErr } = await admin
        .from("course_issues")
        .insert({
          course_id: input.courseId,
          created_by: input.createdBy,
          severity: input.severity,
          title: input.title,
          type: "escalation",
          phase: "migration",
          status: "open",
        })
        .select(`*, profiles:created_by ( full_name, email )`)
        .single();

      if (issueErr) throw issueErr;

      const { data: comment, error: commentErr } = await admin
        .from("course_issue_comments")
        .insert({
          issue_id: issue.id,
          author_id: input.createdBy,
          body: input.firstMessage,
          is_system_message: false,
        })
        .select(`*, profiles:author_id ( full_name, email )`)
        .single();

      if (commentErr) throw commentErr;

      return mapIssue(issue as unknown as RawIssue, [
        mapComment(comment as unknown as RawComment),
      ]);
    },

    async addMessage(escalationId, authorId, body) {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("course_issue_comments")
        .insert({ issue_id: escalationId, author_id: authorId, body, is_system_message: false })
        .select(`*, profiles:author_id ( full_name, email )`)
        .single();

      if (error) throw error;
      return mapComment(data as unknown as RawComment);
    },

    async resolveEscalation(escalationId, resolvedBy, resolutionNote?: string) {
      const admin = getSupabaseAdminClientOrThrow();
      const { error } = await admin
        .from("course_issues")
        .update({ status: "resolved", resolved_by: resolvedBy, resolved_at: new Date().toISOString() })
        .eq("id", escalationId);

      if (error) throw error;

      if (resolutionNote?.trim()) {
        await admin
          .from("course_issue_comments")
          .insert({
            issue_id: escalationId,
            author_id: resolvedBy,
            body: resolutionNote.trim(),
            is_system_message: true,
          });
      }
    },

    async countOpenEscalations() {
      const admin = getSupabaseAdminClientOrThrow();
      const { count, error } = await admin
        .from("course_issues")
        .select("id", { count: "exact", head: true })
        .eq("type", "escalation")
        .eq("status", "open");

      if (error) return 0;
      return count ?? 0;
    },
  };
}
