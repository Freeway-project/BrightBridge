import "server-only";

import type { AssignmentRole } from "@coursebridge/workflow";
import { COURSE_STATUSES } from "@coursebridge/workflow";
import type {
  AdminCourseListFilters,
  AdminCourseRow,
  AssignmentLog,
  AuditEvent,
  CourseAuditEntry,
  CourseAssignmentRecord,
  CourseRepository,
  CourseSummary,
  CreateCourseRecordInput,
  InsertStatusEventInput,
  InstructorCourse,
  PaginatedResult,
  StatusCount,
  StuckCourse,
  SuperAdminCourseRow,
  TAWorkload,
  UnitCourseFacets,
  UnitCourseListFilters,
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
  // Optional embed: present only on list queries that join course_assignments
  // (used to surface the assigned TA / instructor on course cards).
  course_assignments?: Array<{
    role: string;
    profiles?: NamedProfile | NamedProfile[] | null;
  }> | null;
};

type AssignmentProfile = { id: string; full_name: string | null; email: string };
type NamedProfile = { full_name: string | null; email: string };

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

const AUDIT_EVENT_SELECT = `
  id, kind, from_status, to_status, note, created_at, actor_role,
  courses ( id, title ),
  profiles!course_status_events_actor_id_fkey ( full_name, email )
`;

function mapAuditEventRow(row: unknown): AuditEvent {
  const event = row as {
    id: string;
    kind: string | null;
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
    kind: event.kind === "admin_override" ? "admin_override" : "transition",
    actor_name: actorProfile?.full_name ?? null,
    actor_email: actorProfile?.email ?? "",
    actor_role: event.actor_role,
    note: event.note,
    created_at: event.created_at,
  } satisfies AuditEvent;
}

export function createSupabaseCourseRepository(): CourseRepository {
  return {
    async listAccessibleCourses() {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("courses")
        .select(
          `id,source_course_id,target_course_id,title,term,department,org_unit_id,status,created_by,created_at,updated_at,
           course_assignments ( role, profiles!course_assignments_profile_id_fkey ( full_name, email ) )`,
        )
        .order("updated_at", { ascending: false });

      if (error) {
        throw new Error(`Could not load accessible courses: ${error.message}`);
      }

      return (data ?? []).map((row) => toCourseSummary(row as CourseRow));
    },

    async listAssignedCourses(userId, assignmentRole, filters = {}) {
      const admin = getSupabaseAdminClientOrThrow();
      let query = admin
        .from("courses")
        .select(
          "id,source_course_id,target_course_id,title,term,department,org_unit_id,status,created_by,created_at,updated_at,course_assignments!inner(profile_id,role)"
        )
        .eq("course_assignments.profile_id", userId)
        .eq("course_assignments.role", assignmentRole);

      if (filters.statuses?.length) {
        query = query.in("status", [...filters.statuses]);
      }

      const { data, error } = await query.order("updated_at", { ascending: false });

      if (error) {
        throw new Error(`getAssignedCourses: ${error.message}`);
      }

      return (data ?? []).map((row) => toCourseSummary(row as unknown as CourseRow));
    },

    async getAssignedCourseById(courseId, userId, assignmentRole) {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("courses")
        .select(
          "id,source_course_id,target_course_id,title,term,department,org_unit_id,status,created_by,created_at,updated_at,course_assignments!inner(profile_id,role)"
        )
        .eq("id", courseId)
        .eq("course_assignments.profile_id", userId)
        .eq("course_assignments.role", assignmentRole)
        .maybeSingle();

      if (error) {
        throw new Error(`getCourseById: ${error.message}`);
      }

      return data ? toCourseSummary(data as unknown as CourseRow) : null;
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

    async updateCourseOrgUnit(courseId, orgUnitId) {
      const admin = getSupabaseAdminClientOrThrow();
      
      // We also update the department field for consistency if it's currently used for display
      // Though long term we should rely on organizational_units.name
      let department: string | null = null;
      if (orgUnitId) {
        const { data: unit } = await admin
          .from("organizational_units")
          .select("name")
          .eq("id", orgUnitId)
          .maybeSingle();
        department = unit?.name ?? null;
      }

      const { error } = await admin
        .from("courses")
        .update({ 
          org_unit_id: orgUnitId,
          department: department
        })
        .eq("id", courseId);

      if (error) {
        throw new Error(`Could not update course department: ${error.message}`);
      }
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

    async reassignCourseStaff(input) {
      const admin = getSupabaseAdminClientOrThrow();
      const { error } = await admin.rpc("reassign_course_staff", {
        p_course_id: input.courseId,
        p_new_profile_id: input.newProfileId,
        p_actor_id: input.actorId,
        p_reason: input.reason,
      });

      if (error) {
        throw new Error(error.message);
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
      const statuses = filters.statuses && filters.statuses.length > 0 ? filters.statuses : undefined;
      const taProfileId = filters.taProfileId?.trim() || undefined;
      const assignedOnly = filters.assignedOnly === true;
      const requireStaffJoin = assignedOnly || Boolean(taProfileId);
      const searchMatchingStaffIds = normalizedSearch
        ? await findMatchingStaffProfileIds(normalizedSearch)
        : [];
      const searchMatchingStaffCourseIds = searchMatchingStaffIds.length > 0
        ? await findStaffAssignedCourseIds(searchMatchingStaffIds)
        : [];

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

      if (statuses) {
        query = query.in("status", statuses as string[]);
      } else if (status) {
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
        const searchPredicates = [
          `title.ilike.${term}`,
          `source_course_id.ilike.${term}`,
          `target_course_id.ilike.${term}`,
          `term.ilike.${term}`,
          `department.ilike.${term}`,
        ];

        if (!taProfileId && searchMatchingStaffCourseIds.length > 0) {
          searchPredicates.push(`id.in.(${searchMatchingStaffCourseIds.join(",")})`);
        }

        query = query.or(searchPredicates.join(","));
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
          id, source_course_id, target_course_id, title, term, department, org_unit_id, status, updated_at, instructor_summary_notes,
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
        instructor_summary_notes: string | null;
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
        orgUnitId: course.org_unit_id,
        status: toCourseStatus(course.status),
        updatedAt: course.updated_at,
        instructorSummaryNotes: course.instructor_summary_notes ?? null,
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
          id, source_course_id, target_course_id, title, status, term, department, org_unit_id, created_at, updated_at,
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
          source_course_id: string | null;
          target_course_id: string | null;
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
          code: course.source_course_id ?? course.target_course_id ?? null,
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

    async countCourses() {
      const admin = getSupabaseAdminClientOrThrow();
      const { count, error } = await admin.from("courses").select("*", { count: "exact", head: true });
      if (error) throw new Error(`countCourses: ${error.message}`);
      return count ?? 0;
    },

    async listStatusCounts() {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin.from("course_status_counts").select("status, count");

      if (error) {
        if (!isMissingRelationError(error)) {
          throw new Error(`status counts: ${error.message}`);
        }
        return fallbackStatusCounts();
      }

      return (data ?? []).map((row) => ({
        status: toCourseStatus(row.status),
        count: Number(row.count),
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
      const { data, error } = await admin
        .from("ta_workload_stats")
        .select("profile_id, full_name, email, active_courses, needs_fixes")
        .order("full_name", { ascending: true });

      if (error) {
        if (!isMissingRelationError(error)) {
          throw new Error(`ta workload: ${error.message}`);
        }
        return fallbackTAWorkload();
      }

      return (data ?? []).map((row) => ({
        id: row.profile_id,
        full_name: row.full_name,
        email: row.email,
        active_courses: Number(row.active_courses),
        needs_fixes: Number(row.needs_fixes),
      })) satisfies TAWorkload[];
    },

    async listAuditEvents(limit) {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("course_status_events")
        .select(AUDIT_EVENT_SELECT)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`audit: ${error.message}`);
      }

      return (data ?? []).map(mapAuditEventRow);
    },

    async listAuditEventsPage(page, pageSize) {
      const admin = getSupabaseAdminClientOrThrow();
      const safePage = Math.max(1, Math.floor(page));
      const from = (safePage - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await admin
        .from("course_status_events")
        .select(AUDIT_EVENT_SELECT, { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        throw new Error(`audit: ${error.message}`);
      }

      const total = count ?? 0;
      return {
        data: (data ?? []).map(mapAuditEventRow),
        total,
        page: safePage,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      };
    },

    async listCourseStatusEvents(courseId) {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("course_status_events")
        .select(`
          id, kind, from_status, to_status, note, created_at, actor_role,
          courses ( id, title ),
          profiles!course_status_events_actor_id_fkey ( full_name, email )
        `)
        .eq("course_id", courseId)
        .order("created_at", { ascending: true });

      if (error) {
        throw new Error(`course status events: ${error.message}`);
      }

      return (data ?? []).map((row) => {
        const event = row as unknown as {
          id: string;
          kind: string | null;
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
          course_id: relatedCourse?.id ?? courseId,
          course_title: relatedCourse?.title ?? "—",
          from_status: event.from_status,
          to_status: event.to_status,
          kind: event.kind === "admin_override" ? "admin_override" : "transition",
          actor_name: actorProfile?.full_name ?? null,
          actor_email: actorProfile?.email ?? "",
          actor_role: event.actor_role,
          note: event.note,
          created_at: event.created_at,
        } satisfies AuditEvent;
      });
    },

    async listCourseAuditEntries(courseId): Promise<CourseAuditEntry[]> {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("audit_log")
        .select("id, table_name, action, actor_id, old_data, new_data, changed_at")
        .eq("course_id", courseId)
        .in("table_name", [
          "course_assignments",
          "course_escalations",
          "escalation_messages",
          "course_issue_comments",
        ])
        .order("changed_at", { ascending: true });

      if (error) {
        // The audit_log table may not exist yet (migration not applied). Degrade
        // gracefully so the timeline never hard-fails — Postgres 42P01 is
        // "undefined_table". Any other error is logged and also treated as empty.
        if (error.code !== "42P01") {
          console.warn(`listCourseAuditEntries: audit_log read failed: ${error.message}`);
        }
        return [];
      }

      type Row = {
        id: string;
        table_name: CourseAuditEntry["tableName"];
        action: CourseAuditEntry["action"];
        actor_id: string | null;
        old_data: Record<string, unknown> | null;
        new_data: Record<string, unknown> | null;
        changed_at: string;
      };
      const rows = (data ?? []) as Row[];

      // Resolve referenced profile ids (the actor, and the assignment target) to
      // display names in one batched lookup.
      const ids = new Set<string>();
      for (const r of rows) {
        if (r.actor_id) ids.add(r.actor_id);
        const pid = (r.new_data ?? r.old_data)?.["profile_id"];
        if (typeof pid === "string") ids.add(pid);
      }
      const nameById = new Map<string, string | null>();
      if (ids.size > 0) {
        const { data: profs } = await admin
          .from("profiles")
          .select("id, full_name, email")
          .in("id", [...ids]);
        for (const p of (profs ?? []) as Array<{ id: string; full_name: string | null; email: string }>) {
          nameById.set(p.id, p.full_name ?? p.email ?? null);
        }
      }

      const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);

      return rows.map((r) => {
        const d = (r.new_data ?? r.old_data ?? {}) as Record<string, unknown>;
        const targetId = str(d["profile_id"]);
        return {
          id: r.id,
          tableName: r.table_name,
          action: r.action,
          at: r.changed_at,
          actorName: r.actor_id ? (nameById.get(r.actor_id) ?? null) : null,
          role: str(d["role"]),
          targetName: targetId ? (nameById.get(targetId) ?? null) : null,
          title: str(d["title"]),
          body: str(d["body"]),
          status: str(d["status"]),
          isSystem: d["is_system_message"] === true,
        } satisfies CourseAuditEntry;
      });
    },

    async listSubmissionHistory(courseId) {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("course_status_events")
        .select(`id, note, created_at, profiles!course_status_events_actor_id_fkey ( full_name, email )`)
        .eq("course_id", courseId)
        .eq("to_status", "submitted_to_admin")
        .order("created_at", { ascending: true });

      if (error) throw new Error(`submission history: ${error.message}`);

      return (data ?? []).map((row) => {
        const r = row as unknown as {
          id: string;
          note: string | null;
          created_at: string;
          profiles?: { full_name: string | null; email: string } | Array<{ full_name: string | null; email: string }> | null;
        };
        const actor = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
        return {
          id: r.id,
          actorName: actor?.full_name ?? null,
          actorEmail: actor?.email ?? "",
          note: r.note,
          createdAt: r.created_at,
        } satisfies import("@/lib/repositories/contracts").SubmissionEvent;
      });
    },

    async listChangeRequestHistory(courseId) {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("course_status_events")
        .select(`id, note, created_at, profiles!course_status_events_actor_id_fkey ( full_name, email )`)
        .eq("course_id", courseId)
        .eq("to_status", "admin_changes_requested")
        .order("created_at", { ascending: true });

      if (error) throw new Error(`change request history: ${error.message}`);

      return (data ?? []).map((row) => {
        const r = row as unknown as {
          id: string;
          note: string | null;
          created_at: string;
          profiles?: { full_name: string | null; email: string } | Array<{ full_name: string | null; email: string }> | null;
        };
        const actor = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
        return {
          id: r.id,
          actorName: actor?.full_name ?? null,
          actorEmail: actor?.email ?? "",
          note: r.note,
          createdAt: r.created_at,
        } satisfies import("@/lib/repositories/contracts").SubmissionEvent;
      });
    },

    async listQuestionRoundHistory(courseId) {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("course_status_events")
        .select(`id, note, created_at, profiles!course_status_events_actor_id_fkey ( full_name, email )`)
        .eq("course_id", courseId)
        .eq("to_status", "instructor_questions")
        .order("created_at", { ascending: true });

      if (error) throw new Error(`question round history: ${error.message}`);

      return (data ?? []).map((row) => {
        const r = row as unknown as {
          id: string;
          note: string | null;
          created_at: string;
          profiles?: { full_name: string | null; email: string } | Array<{ full_name: string | null; email: string }> | null;
        };
        const actor = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
        return {
          id: r.id,
          actorName: actor?.full_name ?? null,
          actorEmail: actor?.email ?? "",
          note: r.note,
          createdAt: r.created_at,
        } satisfies import("@/lib/repositories/contracts").SubmissionEvent;
      });
    },

    async listRecentAssignments(limit) {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("course_assignments")
        .select(`
          id, course_id, role, assigned_at,
          courses ( title ),
          assigned_user:profiles!course_assignments_profile_id_fkey ( full_name, email ),
          assigner:profiles!course_assignments_assigned_by_fkey ( full_name, email )
        `)
        .order("assigned_at", { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`assignments_log: ${error.message}`);
      }

      return (data ?? []).map((row) => {
        const r = row as any;
        const course = firstRelation(r.courses);
        const assignedUser = firstRelation(r.assigned_user);
        const assigner = firstRelation(r.assigner);

        return {
          id: r.id,
          courseId: r.course_id,
          courseTitle: course?.title ?? "—",
          assignedUser: {
            name: assignedUser?.full_name ?? null,
            email: assignedUser?.email ?? "—",
          },
          role: r.role as AssignmentRole,
          assignedBy: {
            name: assigner?.full_name ?? null,
            email: assigner?.email ?? "—",
          },
          assignedAt: r.assigned_at,
        } satisfies AssignmentLog;
      });
    },

    async listInstructorCourses(profileId) {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("courses")
        .select("id, title, term, department, status, updated_at, course_assignments!inner(profile_id, role)")
        .eq("course_assignments.profile_id", profileId)
        .eq("course_assignments.role", "instructor")
        .in("status", ["sent_to_instructor", "instructor_viewing", "instructor_questions", "instructor_approved", "final_approved"])
        .order("updated_at", { ascending: false });

      if (error) {
        throw new Error(`listInstructorCourses: ${error.message}`);
      }

      return (data ?? []).map((row) => ({
        id: row.id,
        title: row.title,
        term: row.term,
        department: row.department,
        status: toCourseStatus(row.status),
        updatedAt: row.updated_at,
      })) satisfies InstructorCourse[];
    },

    async listCoursesByUnitAncestry(unitIds) {
      const admin = getSupabaseAdminClientOrThrow();
      if (!unitIds.length) return [];

      // org_unit_hierarchy_paths is a recursive VIEW, so PostgREST cannot embed
      // it through a foreign key. Resolve the descendant units in one query,
      // then fetch the courses that live in any of them.
      const { data: paths, error: pathErr } = await admin
        .from("org_unit_hierarchy_paths")
        .select("descendant_id")
        .in("ancestor_id", unitIds);

      if (pathErr) {
        throw new Error(`listCoursesByUnitAncestry (paths): ${pathErr.message}`);
      }

      const descendantIds = [...new Set((paths ?? []).map((p) => p.descendant_id))];
      if (!descendantIds.length) return [];

      const { data, error } = await admin
        .from("courses")
        .select(
          "id,source_course_id,target_course_id,title,term,department,org_unit_id,status,created_by,created_at,updated_at",
        )
        .in("org_unit_id", descendantIds)
        .order("updated_at", { ascending: false });

      if (error) {
        throw new Error(`listCoursesByUnitAncestry: ${error.message}`);
      }

      return (data ?? []).map((row) => toCourseSummary(row as unknown as CourseRow));
    },

    async listCoursesByUnit(unitId, page = 1, pageSize = 50, filters: UnitCourseListFilters = {}) {
      const admin = getSupabaseAdminClientOrThrow();
      const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
      const safePageSize = Number.isFinite(pageSize) ? Math.max(1, Math.floor(pageSize)) : 50;

      const descendantIds = await resolveDescendantUnitIds(admin, [unitId]);
      if (!descendantIds.length) {
        return { data: [], total: 0, page: safePage, pageSize: safePageSize, totalPages: 0 };
      }

      const from = (safePage - 1) * safePageSize;
      const to = from + safePageSize - 1;
      const normalizedSearch = normalizeSearchTerm(filters.search);
      const searchMatchingStaffIds = normalizedSearch
        ? await findMatchingStaffProfileIds(normalizedSearch)
        : [];
      const searchMatchingStaffCourseIds = searchMatchingStaffIds.length > 0
        ? await findStaffAssignedCourseIds(searchMatchingStaffIds)
        : [];

      let query = admin
        .from("courses")
        .select(
          `
          id, source_course_id, target_course_id, title, term, department, org_unit_id, status, updated_at,
          course_assignments (
            role,
            profile_id,
            profiles!course_assignments_profile_id_fkey ( id, full_name, email )
          )
        `,
          { count: "exact" },
        )
        .in("org_unit_id", descendantIds);

      if (filters.status) {
        query = query.eq("status", filters.status);
      }

      if (filters.term) {
        query = query.eq("term", filters.term);
      }

      if (normalizedSearch) {
        const term = `%${normalizedSearch}%`;
        const searchPredicates = [
          `title.ilike.${term}`,
          `source_course_id.ilike.${term}`,
          `target_course_id.ilike.${term}`,
          `term.ilike.${term}`,
          `department.ilike.${term}`,
        ];
        if (searchMatchingStaffCourseIds.length > 0) {
          searchPredicates.push(`id.in.(${searchMatchingStaffCourseIds.join(",")})`);
        }
        query = query.or(searchPredicates.join(","));
      }

      const { data, error, count } = await query
        .order("updated_at", { ascending: false })
        .range(from, to);

      if (error) {
        throw new Error(`listCoursesByUnit: ${error.message}`);
      }

      const total = count ?? 0;
      return {
        data: mapAdminCourseRows(data ?? []),
        total,
        page: safePage,
        pageSize: safePageSize,
        totalPages: Math.ceil(total / safePageSize),
      } satisfies PaginatedResult<AdminCourseRow>;
    },

    async getUnitCourseFacets(unitId) {
      const admin = getSupabaseAdminClientOrThrow();
      const descendantIds = await resolveDescendantUnitIds(admin, [unitId]);
      if (!descendantIds.length) {
        return { statusCounts: [], terms: [], total: 0 };
      }

      const rows = await fetchAllSubtreeCourses(admin, descendantIds, "status, term");

      const counts = new Map<string, number>();
      const terms = new Set<string>();
      for (const row of rows as Array<{ status: string; term: string | null }>) {
        counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
        const t = row.term?.trim();
        if (t) terms.add(t);
      }

      const statusCounts: StatusCount[] = COURSE_STATUSES.filter((s) => counts.has(s)).map((s) => ({
        status: s,
        count: counts.get(s) ?? 0,
      }));

      return {
        statusCounts,
        terms: [...terms].sort((a, b) => b.localeCompare(a)),
        total: rows.length,
      } satisfies UnitCourseFacets;
    },

    async getChildUnitCourseCounts(childUnitIds) {
      const admin = getSupabaseAdminClientOrThrow();
      const result: Record<string, number> = {};
      for (const id of childUnitIds) result[id] = 0;
      if (!childUnitIds.length) return result;

      // Siblings' subtrees are disjoint, so each descendant maps to exactly one
      // child. Resolve all child subtrees in one paths query, then tally courses.
      const { data: paths, error: pathErr } = await admin
        .from("org_unit_hierarchy_paths")
        .select("ancestor_id, descendant_id")
        .in("ancestor_id", childUnitIds);

      if (pathErr) {
        throw new Error(`getChildUnitCourseCounts (paths): ${pathErr.message}`);
      }

      const descendantToChild = new Map<string, string>();
      for (const p of paths ?? []) descendantToChild.set(p.descendant_id, p.ancestor_id);
      const descendantIds = [...descendantToChild.keys()];
      if (!descendantIds.length) return result;

      const rows = await fetchAllSubtreeCourses(admin, descendantIds, "org_unit_id");
      for (const row of rows as Array<{ org_unit_id: string | null }>) {
        const child = row.org_unit_id ? descendantToChild.get(row.org_unit_id) : undefined;
        if (child) result[child] = (result[child] ?? 0) + 1;
      }
      return result;
    },
  };
}

function namedProfileFor(row: CourseRow, role: string): { name: string | null; email: string } | null {
  const assignment = row.course_assignments?.find((a) => a.role === role);
  const profile = firstRelation(assignment?.profiles);
  return profile ? { name: profile.full_name, email: profile.email } : null;
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
    // Only meaningful when the query embedded course_assignments+profiles
    // (e.g. listAccessibleCourses); otherwise both stay null.
    ta: namedProfileFor(row, "staff"),
    instructor: namedProfileFor(row, "instructor"),
  };
}

function normalizeSearchTerm(value: string | undefined) {
  if (!value) {
    return "";
  }

  return value
    .replace(/[%]/g, "")
    .replace(/[.,:()'"`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function findMatchingStaffProfileIds(searchTerm: string): Promise<string[]> {
  const admin = getSupabaseAdminClientOrThrow();
  const term = `%${searchTerm}%`;
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "standard_user")
    .or(`full_name.ilike.${term},email.ilike.${term}`)
    .limit(200);

  if (error) {
    throw new Error(`findMatchingStaffProfileIds: ${error.message}`);
  }

  return (data ?? []).map((row) => row.id);
}

async function findStaffAssignedCourseIds(profileIds: string[]): Promise<string[]> {
  const admin = getSupabaseAdminClientOrThrow();
  const { data, error } = await admin
    .from("course_assignments")
    .select("course_id")
    .eq("role", "staff")
    .in("profile_id", profileIds)
    .limit(500);

  if (error) {
    throw new Error(`findStaffAssignedCourseIds: ${error.message}`);
  }

  return Array.from(new Set((data ?? []).map((row) => row.course_id)));
}

type AdminClient = ReturnType<typeof getSupabaseAdminClientOrThrow>;

// Resolves a unit (or units) to its whole subtree of unit ids via the recursive
// org_unit_hierarchy_paths view (each unit is its own descendant at depth 0).
async function resolveDescendantUnitIds(admin: AdminClient, unitIds: string[]): Promise<string[]> {
  if (!unitIds.length) return [];
  const { data, error } = await admin
    .from("org_unit_hierarchy_paths")
    .select("descendant_id")
    .in("ancestor_id", unitIds);
  if (error) {
    throw new Error(`resolveDescendantUnitIds: ${error.message}`);
  }
  return [...new Set((data ?? []).map((p) => p.descendant_id))];
}

// Fetches every course in the given units, paging past PostgREST's 1000-row cap.
// `columns` selects only what the caller needs (e.g. "status, term") to keep the
// payload small over large subtrees.
async function fetchAllSubtreeCourses(
  admin: AdminClient,
  unitIds: string[],
  columns: string,
): Promise<unknown[]> {
  if (!unitIds.length) return [];
  const PAGE = 1000;
  const all: unknown[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await admin
      .from("courses")
      .select(columns)
      .in("org_unit_id", unitIds)
      .range(offset, offset + PAGE - 1);
    if (error) {
      throw new Error(`fetchAllSubtreeCourses: ${error.message}`);
    }
    const batch = (data ?? []) as unknown[];
    all.push(...batch);
    if (batch.length < PAGE) break;
  }
  return all;
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
      orgUnitId: course.org_unit_id,
      status: toCourseStatus(course.status),
      updatedAt: course.updated_at,
      instructorSummaryNotes: null,
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

function isMissingRelationError(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST205";
}

async function fallbackStatusCounts(): Promise<StatusCount[]> {
  const admin = getSupabaseAdminClientOrThrow();

  // The course_status_counts view is missing — count each status server-side
  // with head/count queries instead of pulling rows. A plain
  // `select("status")` is silently capped at PostgREST's default ~1000 rows, so
  // it undercounts any table larger than that (the cause of the prod "874 vs
  // 2286" Staging bug). head:true transfers no rows and returns exact totals.
  const results = await Promise.all(
    COURSE_STATUSES.map(async (status) => {
      const { count, error } = await admin
        .from("courses")
        .select("*", { count: "exact", head: true })
        .eq("status", status);

      if (error) {
        throw new Error(`status counts fallback: ${error.message}`);
      }

      return { status: toCourseStatus(status), count: count ?? 0 } satisfies StatusCount;
    }),
  );

  // Match the view's shape: omit statuses with no courses.
  return results.filter((row) => row.count > 0);
}

async function fallbackTAWorkload(): Promise<TAWorkload[]> {
  const admin = getSupabaseAdminClientOrThrow();

  // The ta_workload_stats view is missing — aggregate the staff assignments
  // here. A single select is capped at PostgREST's default ~1000 rows, so page
  // through (ordered by the PK for stable paging) to avoid undercounting on
  // installs with more than 1000 staff assignments.
  const PAGE = 1000;
  const rows: unknown[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from("course_assignments")
      .select(`
        profile_id, role,
        courses!inner ( status ),
        profiles!course_assignments_profile_id_fkey ( full_name, email )
      `)
      .eq("role", "staff")
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);

    if (error) {
      throw new Error(`ta workload fallback: ${error.message}`);
    }

    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < PAGE) break;
  }

  const byProfile = new Map<string, TAWorkload>();
  for (const row of rows) {
    const typed = row as {
      profile_id: string;
      courses?: { status: string } | Array<{ status: string }> | null;
      profiles?:
        | { full_name: string | null; email: string | null }
        | Array<{ full_name: string | null; email: string | null }>
        | null;
    };
    const profile = firstRelation(typed.profiles);
    const course = firstRelation(typed.courses);
    if (!byProfile.has(typed.profile_id)) {
      byProfile.set(typed.profile_id, {
        id: typed.profile_id,
        full_name: profile?.full_name ?? null,
        email: profile?.email ?? "",
        active_courses: 0,
        needs_fixes: 0,
      });
    }
    const record = byProfile.get(typed.profile_id)!;
    if (!course?.status) continue;
    if (course.status !== "final_approved") {
      record.active_courses += 1;
    }
    if (course.status === "admin_changes_requested" || course.status === "instructor_questions") {
      record.needs_fixes += 1;
    }
  }

  return Array.from(byProfile.values()).sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""));
}
