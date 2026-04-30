import "server-only";

import type { AssignmentRole } from "@coursebridge/workflow";
import type {
  AdminCourseListFilters,
  AdminCourseRow,
  AssignedCourse,
  AuditEvent,
  CourseAssignmentRecord,
  CourseRepository,
  CourseSummary,
  CreateCourseRecordInput,
  InsertStatusEventInput,
  PaginatedResult,
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
  org_unit_id: string | null;
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
          "id,source_course_id,target_course_id,title,term,department,org_unit_id,status,created_by,created_at,updated_at",
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
          org_unit_id: input.orgUnitId ?? null,
          status: input.status,
          created_by: input.createdBy,
        })
        .select(
          "id,source_course_id,target_course_id,title,term,department,org_unit_id,status,created_by,created_at,updated_at",
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
          "id,source_course_id,target_course_id,title,term,department,org_unit_id,status,created_by,created_at,updated_at",
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
          "id,source_course_id,target_course_id,title,term,department,org_unit_id,status,created_by,created_at,updated_at",
        )
        .single();

      if (error) {
        throw new Error(`Could not update course status: ${error.message}`);
      }

      return toCourseSummary(data as CourseRow);
    },

    async getCourseAssignment(courseId, profileId) {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("course_assignments")
        .select("course_id, profile_id, role")
        .eq("course_id", courseId)
        .eq("profile_id", profileId)
        .maybeSingle();

      if (error) {
        throw new Error(`getCourseAssignment: ${error.message}`);
      }

      if (!data) return null;

      return {
        courseId: data.course_id,
        profileId: data.profile_id,
        role: data.role as AssignmentRole,
      } satisfies CourseAssignmentRecord;
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
          id, source_course_id, target_course_id, title, term, department, org_unit_id, status, updated_at,
          course_assignments (
            role,
            profiles!course_assignments_profile_id_fkey ( id, full_name, email )
          )
        `)
        .order("updated_at", { ascending: false });

      if (error) {
        throw new Error(`getAdminCourses: ${error.message}`);
      }

      return mapAdminCourseRows(data ?? []);
    },

    async listAdminCoursesPage(page = 1, pageSize = 50, filters: AdminCourseListFilters = {}) {
      const admin = getSupabaseAdminClientOrThrow();
      const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
      const safePageSize = Number.isFinite(pageSize) ? Math.max(1, Math.floor(pageSize)) : 50;
      const from = (safePage - 1) * safePageSize;
      const to = from + safePageSize - 1;
      const normalizedSearch = normalizeSearchTerm(filters.search);
      const status = filters.status;
      const taProfileId = filters.taProfileId?.trim() || undefined;
      const assignedOnly = filters.assignedOnly === true;
      const requireStaffJoin = assignedOnly || Boolean(taProfileId);

      let query = admin
        .from("courses")
        .select(
          `
          id, source_course_id, target_course_id, title, term, department, org_unit_id, status, updated_at,
          course_assignments${requireStaffJoin ? "!inner" : ""} (
            role,
            profile_id,
            profiles!course_assignments_profile_id_fkey ( id, full_name, email )
          )
        `,
          { count: "exact" },
        );

      if (status) {
        query = query.eq("status", status);
      }

      if (requireStaffJoin) {
        query = query.eq("course_assignments.role", "staff");
      }

      if (taProfileId) {
        query = query.eq("course_assignments.profile_id", taProfileId);
      }

      if (normalizedSearch) {
        const term = `%${normalizedSearch}%`;
        query = query.or(
          [
            `title.ilike.${term}`,
            `source_course_id.ilike.${term}`,
            `target_course_id.ilike.${term}`,
            `term.ilike.${term}`,
            `department.ilike.${term}`,
          ].join(","),
        );
      }

      const { data, error, count } = await query
        .order("updated_at", { ascending: false })
        .range(from, to);

      if (error) {
        throw new Error(`listAdminCoursesPage: ${error.message}`);
      }

      const rows = mapAdminCourseRows(data ?? []);
      const total = count ?? 0;

      return {
        data: rows,
        total,
        page: safePage,
        pageSize: safePageSize,
        totalPages: Math.ceil(total / safePageSize),
      } satisfies PaginatedResult<AdminCourseRow>;
    },

    async getAdminCourse(courseId) {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("courses")
        .select(`
          id, source_course_id, target_course_id, title, term, department, org_unit_id, status, updated_at,
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
        org_unit_id: string | null;
        status: string;
        updated_at: string;
        course_assignments?: Array<{
          role: string;
          profiles?: AssignmentProfile | AssignmentProfile[] | null;
        }>;
      };
      const staffAssignment = course.course_assignments?.find((assignment) => assignment.role === "staff");
      const staffProfile = firstRelation(staffAssignment?.profiles);

      return {
        id: course.id,
        sourceCourseId: course.source_course_id,
        targetCourseId: course.target_course_id,
        title: course.title,
        term: course.term,
        department: course.department,
        status: toCourseStatus(course.status),
        updatedAt: course.updated_at,
        ta: staffProfile
          ? {
              id: staffProfile.id,
              name: staffProfile.full_name,
              email: staffProfile.email,
            }
          : null,
      } satisfies AdminCourseRow;
    },

    async listSuperAdminCourses(page = 1, pageSize = 20, search = "") {
      const admin = getSupabaseAdminClientOrThrow();
      
      let query = admin
        .from("courses")
        .select(`
          id, title, status, term, department, org_unit_id, created_at, updated_at,
          course_assignments (
            role,
            profiles!course_assignments_profile_id_fkey ( full_name, email )
          )
        `, { count: "exact" });

      if (search) {
        query = query.or(`title.ilike.%${search}%,status.ilike.%${search}%`);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await query
        .order("updated_at", { ascending: false })
        .range(from, to);

      if (error) {
        throw new Error(`courses: ${error.message}`);
      }

      const rows = (data ?? []).map((row) => {
        const course = row as unknown as {
          id: string;
          title: string;
          status: string;
          term: string | null;
          department: string | null;
          org_unit_id: string | null;
          created_at: string;
          updated_at: string;
          course_assignments?: Array<{
            role: string;
            profiles?: NamedProfile | NamedProfile[] | null;
          }>;
        };
        const staff = course.course_assignments?.find((assignment) => assignment.role === "staff");
        const instructor = course.course_assignments?.find(
          (assignment) => assignment.role === "instructor",
        );
        const staffProfile = firstRelation(staff?.profiles);
        const instructorProfile = firstRelation(instructor?.profiles);

        return {
          id: course.id,
          title: course.title,
          status: toCourseStatus(course.status),
          term: course.term,
          department: course.department,
          created_at: course.created_at,
          updated_at: course.updated_at,
          ta: staffProfile ? { name: staffProfile.full_name, email: staffProfile.email } : null,
          instructor: instructorProfile
            ? { name: instructorProfile.full_name, email: instructorProfile.email }
            : null,
        } satisfies SuperAdminCourseRow;
      });

      const total = count ?? 0;
      return {
        data: rows,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
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
      const { data: staff, error: staffError } = await admin
        .from("profiles")
        .select("id, email, full_name")
        .eq("role", "standard_user");

      if (staffError) {
        throw new Error(`staff list: ${staffError.message}`);
      }

      const { data: assignments, error: assignError } = await admin
        .from("course_assignments")
        .select("profile_id, courses(status)")
        .eq("role", "staff");

      if (assignError) {
        throw new Error(`assignments: ${assignError.message}`);
      }

      return (staff ?? []).map((member) => {
        const memberAssignments = (assignments ?? []).filter((assignment) => assignment.profile_id === member.id);
        const active = memberAssignments.filter(
          (assignment) =>
            firstRelation(assignment.courses)?.status !== "final_approved" &&
            firstRelation(assignment.courses)?.status !== "submitted_to_admin",
        );
        const needsFixes = memberAssignments.filter(
          (assignment) => firstRelation(assignment.courses)?.status === "admin_changes_requested",
        );

        return {
          id: member.id,
          full_name: member.full_name,
          email: member.email,
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

    async listCoursesByUnitAncestry(unitIds) {
      const admin = getSupabaseAdminClientOrThrow();
      
      // We join through the org_unit_hierarchy_paths view
      const { data, error } = await admin
        .from("courses")
        .select(`
          id,source_course_id,target_course_id,title,term,department,org_unit_id,status,created_by,created_at,updated_at,
          organizational_units!courses_org_unit_id_fkey!inner (
            org_unit_hierarchy_paths!org_unit_hierarchy_paths_descendant_id_fkey!inner (
              ancestor_id
            )
          )
        `)
        .in("organizational_units.org_unit_hierarchy_paths.ancestor_id", unitIds)
        .order("updated_at", { ascending: false });

      if (error) {
        throw new Error(`listCoursesByUnitAncestry: ${error.message}`);
      }

      return (data ?? []).map((row) => toCourseSummary(row as unknown as CourseRow));
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
    orgUnitId: row.org_unit_id,
    status: toCourseStatus(row.status),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeSearchTerm(value: string | undefined) {
  if (!value) {
    return "";
  }

  return value
    .replace(/[%]/g, "")
    .replace(/[.,:()]/g, " ")
    .trim();
}

function mapAdminCourseRows(data: unknown[]): AdminCourseRow[] {
  return data.map((row) => {
    const course = row as {
      id: string;
      source_course_id: string | null;
      target_course_id: string | null;
      title: string;
      term: string | null;
      department: string | null;
      org_unit_id: string | null;
      status: string;
      updated_at: string;
      course_assignments?: Array<{
        role: string;
        profiles?: AssignmentProfile | AssignmentProfile[] | null;
      }>;
    };
    const staffAssignment = course.course_assignments?.find((assignment) => assignment.role === "staff");
    const staffProfile = firstRelation(staffAssignment?.profiles);

    return {
      id: course.id,
      sourceCourseId: course.source_course_id,
      targetCourseId: course.target_course_id,
      title: course.title,
      term: course.term,
      department: course.department,
      status: toCourseStatus(course.status),
      updatedAt: course.updated_at,
      ta: staffProfile
        ? {
            id: staffProfile.id,
            name: staffProfile.full_name,
            email: staffProfile.email,
          }
        : null,
    } satisfies AdminCourseRow;
  });
}
