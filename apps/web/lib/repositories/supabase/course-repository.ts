import "server-only";

import type {
  AdminCourseRow,
  AssignedCourse,
  AuditEvent,
  CourseRepository,
  CourseSummary,
  CreateCourseRecordInput,
  InsertStatusEventInput,
  StatusCount,
  StuckCourse,
  SuperAdminCourseRow,
  TAWorkload,
} from "@/lib/repositories/contracts";
import { cleanOptionalText, getSupabaseAdminClientOrThrow, toCourseStatus } from "./shared";

type CourseRow = {
  id: string;
  source_course_id: string | null;
  target_course_id: string | null;
  title: string;
  term: string | null;
  department: string | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type AssignmentProfile = { id: string; full_name: string | null; email: string };
type NamedProfile = { full_name: string | null; email: string };

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export function createSupabaseCourseRepository(): CourseRepository {
  return {
    async listAccessibleCourses() {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("courses")
        .select(
          "id,source_course_id,target_course_id,title,term,department,status,created_by,created_at,updated_at",
        )
        .order("updated_at", { ascending: false });

      if (error) {
        throw new Error(`Could not load accessible courses: ${error.message}`);
      }

      return (data ?? []).map((row) => toCourseSummary(row as CourseRow));
    },

    async listAssignedCourses(userId) {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("courses")
        .select("id, title, term, department, status, created_at, course_assignments!inner(profile_id)")
        .eq("course_assignments.profile_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(`getAssignedCourses: ${error.message}`);
      }

      return (data ?? []) as AssignedCourse[];
    },

    async getAssignedCourseById(courseId, userId) {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("courses")
        .select("id, title, term, department, status, created_at, course_assignments!inner(profile_id)")
        .eq("id", courseId)
        .eq("course_assignments.profile_id", userId)
        .maybeSingle();

      if (error) {
        throw new Error(`getCourseById: ${error.message}`);
      }

      return (data as AssignedCourse | null) ?? null;
    },

    async createCourse(input: CreateCourseRecordInput) {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("courses")
        .insert({
          source_course_id: cleanOptionalText(input.sourceCourseId),
          target_course_id: cleanOptionalText(input.targetCourseId),
          title: input.title,
          term: cleanOptionalText(input.term),
          department: cleanOptionalText(input.department),
          status: input.status,
          created_by: input.createdBy,
        })
        .select(
          "id,source_course_id,target_course_id,title,term,department,status,created_by,created_at,updated_at",
        )
        .single();

      if (error) {
        throw new Error(`Could not create course: ${error.message}`);
      }

      return toCourseSummary(data as CourseRow);
    },

    async getCourseSummaryById(courseId) {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("courses")
        .select(
          "id,source_course_id,target_course_id,title,term,department,status,created_by,created_at,updated_at",
        )
        .eq("id", courseId)
        .single();

      if (error) {
        throw new Error(`Could not load course: ${error.message}`);
      }

      return toCourseSummary(data as CourseRow);
    },

    async updateCourseStatus(courseId, status) {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("courses")
        .update({ status })
        .eq("id", courseId)
        .select(
          "id,source_course_id,target_course_id,title,term,department,status,created_by,created_at,updated_at",
        )
        .single();

      if (error) {
        throw new Error(`Could not update course status: ${error.message}`);
      }

      return toCourseSummary(data as CourseRow);
    },

    async hasAssignment(courseId, profileId, role) {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("course_assignments")
        .select("id")
        .eq("course_id", courseId)
        .eq("profile_id", profileId)
        .eq("role", role)
        .limit(1);

      if (error) {
        throw new Error(`Could not verify course assignment: ${error.message}`);
      }

      return Boolean(data && data.length > 0);
    },

    async assignUserToCourse(input) {
      const admin = getSupabaseAdminClientOrThrow();
      const { error } = await admin.from("course_assignments").upsert(
        {
          course_id: input.courseId,
          profile_id: input.profileId,
          role: input.role,
          assigned_by: input.assignedBy,
        },
        {
          onConflict: "course_id,profile_id,role",
        },
      );

      if (error) {
        throw new Error(`Could not assign user to course: ${error.message}`);
      }
    },

    async insertStatusEvent(input: InsertStatusEventInput) {
      const admin = getSupabaseAdminClientOrThrow();
      const { error } = await admin.from("course_status_events").insert({
        course_id: input.courseId,
        from_status: input.fromStatus,
        to_status: input.toStatus,
        actor_id: input.actorId,
        actor_role: input.actorRole,
        note: cleanOptionalText(input.note),
      });

      if (error) {
        throw new Error(`Could not record course status event: ${error.message}`);
      }
    },

    async listAdminCourses() {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("courses")
        .select(`
          id, source_course_id, target_course_id, title, term, department, status, updated_at,
          course_assignments (
            role,
            profiles!course_assignments_profile_id_fkey ( id, full_name, email )
          )
        `)
        .order("updated_at", { ascending: false });

      if (error) {
        throw new Error(`getAdminCourses: ${error.message}`);
      }

      return (data ?? []).map((row) => {
        const course = row as unknown as {
          id: string;
          source_course_id: string | null;
          target_course_id: string | null;
          title: string;
          term: string | null;
          department: string | null;
          status: string;
          updated_at: string;
          course_assignments?: Array<{
            role: string;
            profiles?: AssignmentProfile | AssignmentProfile[] | null;
          }>;
        };
        const taAssignment = course.course_assignments?.find((assignment) => assignment.role === "ta");
        const taProfile = firstRelation(taAssignment?.profiles);

        return {
          id: course.id,
          sourceCourseId: course.source_course_id,
          targetCourseId: course.target_course_id,
          title: course.title,
          term: course.term,
          department: course.department,
          status: toCourseStatus(course.status),
          updatedAt: course.updated_at,
          ta: taProfile
            ? {
                id: taProfile.id,
                name: taProfile.full_name,
                email: taProfile.email,
              }
            : null,
        } satisfies AdminCourseRow;
      });
    },

    async getAdminCourse(courseId) {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("courses")
        .select(`
          id, source_course_id, target_course_id, title, term, department, status, updated_at,
          course_assignments (
            role,
            profiles!course_assignments_profile_id_fkey ( id, full_name, email )
          )
        `)
        .eq("id", courseId)
        .single();

      if (error) {
        return null;
      }

      const course = data as unknown as {
        id: string;
        source_course_id: string | null;
        target_course_id: string | null;
        title: string;
        term: string | null;
        department: string | null;
        status: string;
        updated_at: string;
        course_assignments?: Array<{
          role: string;
          profiles?: AssignmentProfile | AssignmentProfile[] | null;
        }>;
      };
      const taAssignment = course.course_assignments?.find((assignment) => assignment.role === "ta");
      const taProfile = firstRelation(taAssignment?.profiles);

      return {
        id: course.id,
        sourceCourseId: course.source_course_id,
        targetCourseId: course.target_course_id,
        title: course.title,
        term: course.term,
        department: course.department,
        status: toCourseStatus(course.status),
        updatedAt: course.updated_at,
        ta: taProfile
          ? {
              id: taProfile.id,
              name: taProfile.full_name,
              email: taProfile.email,
            }
          : null,
      } satisfies AdminCourseRow;
    },

    async listSuperAdminCourses() {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("courses")
        .select(`
          id, title, status, term, department, created_at, updated_at,
          course_assignments (
            role,
            profiles!course_assignments_profile_id_fkey ( full_name, email )
          )
        `)
        .order("updated_at", { ascending: false });

      if (error) {
        throw new Error(`courses: ${error.message}`);
      }

      return (data ?? []).map((row) => {
        const course = row as unknown as {
          id: string;
          title: string;
          status: string;
          term: string | null;
          department: string | null;
          created_at: string;
          updated_at: string;
          course_assignments?: Array<{
            role: string;
            profiles?: NamedProfile | NamedProfile[] | null;
          }>;
        };
        const ta = course.course_assignments?.find((assignment) => assignment.role === "ta");
        const instructor = course.course_assignments?.find(
          (assignment) => assignment.role === "instructor",
        );
        const taProfile = firstRelation(ta?.profiles);
        const instructorProfile = firstRelation(instructor?.profiles);

        return {
          id: course.id,
          title: course.title,
          status: toCourseStatus(course.status),
          term: course.term,
          department: course.department,
          created_at: course.created_at,
          updated_at: course.updated_at,
          ta: taProfile ? { name: taProfile.full_name, email: taProfile.email } : null,
          instructor: instructorProfile
            ? { name: instructorProfile.full_name, email: instructorProfile.email }
            : null,
        } satisfies SuperAdminCourseRow;
      });
    },

    async listStatusCounts() {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin.from("courses").select("status");

      if (error) {
        throw new Error(`status counts: ${error.message}`);
      }

      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        counts[row.status] = (counts[row.status] ?? 0) + 1;
      }

      return Object.entries(counts).map(([status, count]) => ({
        status: toCourseStatus(status),
        count,
      })) satisfies StatusCount[];
    },

    async listStuckCourses(cutoffIso) {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("courses")
        .select("id, title, status, updated_at")
        .neq("status", "final_approved")
        .lt("updated_at", cutoffIso)
        .order("updated_at", { ascending: true });

      if (error) {
        throw new Error(`stuck courses: ${error.message}`);
      }

      return (data ?? []).map((row) => ({
        id: row.id,
        title: row.title,
        status: toCourseStatus(row.status),
        days_stuck: Math.floor((Date.now() - new Date(row.updated_at).getTime()) / 86_400_000),
        updated_at: row.updated_at,
      })) satisfies StuckCourse[];
    },

    async listTAWorkload() {
      const admin = getSupabaseAdminClientOrThrow();
      const { data: tas, error: tasError } = await admin
        .from("profiles")
        .select("id, email, full_name")
        .eq("role", "ta");

      if (tasError) {
        throw new Error(`ta list: ${tasError.message}`);
      }

      const { data: assignments, error: assignError } = await admin
        .from("course_assignments")
        .select("profile_id, courses(status)")
        .eq("role", "ta");

      if (assignError) {
        throw new Error(`assignments: ${assignError.message}`);
      }

      return (tas ?? []).map((ta) => {
        const taAssignments = (assignments ?? []).filter((assignment) => assignment.profile_id === ta.id);
        const active = taAssignments.filter(
          (assignment) =>
            firstRelation(assignment.courses)?.status !== "final_approved" &&
            firstRelation(assignment.courses)?.status !== "submitted_to_admin",
        );
        const needsFixes = taAssignments.filter(
          (assignment) => firstRelation(assignment.courses)?.status === "admin_changes_requested",
        );

        return {
          id: ta.id,
          full_name: ta.full_name,
          email: ta.email,
          active_courses: active.length,
          needs_fixes: needsFixes.length,
        } satisfies TAWorkload;
      });
    },

    async listAuditEvents(limit) {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("course_status_events")
        .select(`
          id, from_status, to_status, note, created_at, actor_role,
          courses ( id, title ),
          profiles!course_status_events_actor_id_fkey ( full_name, email )
        `)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`audit: ${error.message}`);
      }

      return (data ?? []).map((row) => {
        const event = row as unknown as {
          id: string;
          from_status: string | null;
          to_status: string;
          note: string | null;
          created_at: string;
          actor_role: string;
          courses?: { id: string; title: string } | Array<{ id: string; title: string }> | null;
          profiles?:
            | { full_name: string | null; email: string }
            | Array<{ full_name: string | null; email: string }>
            | null;
        };
        const relatedCourse = firstRelation(event.courses);
        const actorProfile = firstRelation(event.profiles);

        return {
          id: event.id,
          course_id: relatedCourse?.id ?? "",
          course_title: relatedCourse?.title ?? "—",
          from_status: event.from_status,
          to_status: event.to_status,
          actor_name: actorProfile?.full_name ?? null,
          actor_email: actorProfile?.email ?? "",
          actor_role: event.actor_role,
          note: event.note,
          created_at: event.created_at,
        } satisfies AuditEvent;
      });
    },
  };
}

function toCourseSummary(row: CourseRow): CourseSummary {
  return {
    id: row.id,
    sourceCourseId: row.source_course_id,
    targetCourseId: row.target_course_id,
    title: row.title,
    term: row.term,
    department: row.department,
    status: toCourseStatus(row.status),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
