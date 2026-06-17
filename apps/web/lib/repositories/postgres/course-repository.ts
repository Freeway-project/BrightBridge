import "server-only";

import type { AssignmentRole } from "@coursebridge/workflow";
import type {
  AccessibleCourseAggregates,
  AccessibleCourseListFilters,
  AccessibleCourseScope,
  AdminCourseListFilters,
  AdminCourseRow,
  AssignmentLog,
  AuditEvent,
  CourseAssignmentRecord,
  CourseAuditEntry,
  CourseRepository,
  CourseSummary,
  CreateCourseRecordInput,
  InsertStatusEventInput,
  InstructorCourse,
  PaginatedResult,
  StatusCount,
  StuckCourse,
  SubmissionEvent,
  SuperAdminCourseRow,
  TAWorkload,
  UnitCourseFacets,
  UnitCourseListFilters,
} from "@/lib/repositories/contracts";
import { getPostgresPool } from "@/lib/postgres/pool";
import { COURSE_STATUSES, type CourseStatus } from "@coursebridge/workflow";

type CourseRow = {
  id: string;
  source_course_id: string | null;
  target_course_id: string | null;
  title: string;
  term: string | null;
  department: string | null;
  org_unit_id: string | null;
  org_unit_name?: string | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

// Shape of the staff-joined course row used by the admin/unit list views.
type AdminCourseJoinRow = {
  id: string;
  source_course_id: string | null;
  target_course_id: string | null;
  title: string;
  term: string | null;
  department: string | null;
  org_unit_id: string | null;
  status: string;
  updated_at: string;
  ta_id: string | null;
  ta_name: string | null;
  ta_email: string | null;
  instructor_id: string | null;
  instructor_name: string | null;
  instructor_email: string | null;
  instructor_summary_notes?: string | null;
};

// The staff (TA) lateral join shared by every AdminCourseRow query. Selecting the
// most-recently-assigned `staff` assignment keeps parity with the Supabase repo.
const ADMIN_COURSE_STAFF_JOIN = `
  LEFT JOIN LATERAL (
    SELECT p.id, p.full_name, p.email
    FROM course_assignments ca
    INNER JOIN profiles p ON p.id = ca.profile_id
    WHERE ca.course_id = c.id AND ca.role = 'staff'
    ORDER BY ca.assigned_at DESC
    LIMIT 1
  ) ta ON TRUE
`;

// The instructor lateral join — same pattern for the assigned instructor.
const ADMIN_COURSE_INSTRUCTOR_JOIN = `
  LEFT JOIN LATERAL (
    SELECT p.id, p.full_name, p.email
    FROM course_assignments ca
    INNER JOIN profiles p ON p.id = ca.profile_id
    WHERE ca.course_id = c.id AND ca.role = 'instructor'
    ORDER BY ca.assigned_at DESC
    LIMIT 1
  ) instr ON TRUE
`;

function cleanOptionalText(value: string | null | undefined) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

function toCourseStatus(value: string): CourseStatus {
  if (!COURSE_STATUSES.includes(value as CourseStatus)) {
    throw new Error(`Unsupported course status: ${value}`);
  }
  return value as CourseStatus;
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
    orgUnitName: row.org_unit_name ?? null,
    status: toCourseStatus(row.status),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Maps a staff-joined row to AdminCourseRow. `instructor_summary_notes` is only
// selected by getAdminCourse; the list views leave it null (parity with the
// Supabase repo's mapAdminCourseRows).
function mapAdminCourseRow(row: AdminCourseJoinRow): AdminCourseRow {
  return {
    id: row.id,
    sourceCourseId: row.source_course_id,
    targetCourseId: row.target_course_id,
    title: row.title,
    term: row.term,
    department: row.department,
    orgUnitId: row.org_unit_id,
    status: toCourseStatus(row.status),
    updatedAt: row.updated_at,
    instructorSummaryNotes: row.instructor_summary_notes ?? null,
    ta: row.ta_id
      ? {
          id: row.ta_id,
          name: row.ta_name,
          email: row.ta_email ?? "",
        }
      : null,
    instructor: row.instructor_id
      ? {
          id: row.instructor_id,
          name: row.instructor_name,
          email: row.instructor_email ?? "",
        }
      : null,
  };
}

// Subject prefix derived from `source_course_id` ("CHEM101" → "CHEM"). Mirrors
// the regex used by the client list view so admin and dropdown values agree.
const SUBJECT_EXPR = `UPPER(substring(c.source_course_id from '^[A-Za-z]+'))`;

// Build the shared WHERE for the accessible-courses page + aggregate queries.
// `omit` lets callers drop a single dimension (used by aggregates so the status
// filter doesn't suppress the very counts we're computing).
function buildAccessibleWhere(
  filters: AccessibleCourseListFilters,
  omit: "status" | null = null,
) {
  const values: unknown[] = [];
  const where: string[] = [];

  if (filters.scope.kind === "assigned") {
    values.push(filters.scope.profileId, filters.scope.role);
    where.push(
      `EXISTS (SELECT 1 FROM course_assignments ca WHERE ca.course_id = c.id AND ca.profile_id = $${values.length - 1} AND ca.role = $${values.length})`,
    );
  }

  if (omit !== "status" && filters.status) {
    values.push(filters.status);
    where.push(`c.status = $${values.length}`);
  }

  if (filters.subject?.trim()) {
    values.push(filters.subject.trim().toUpperCase());
    where.push(`${SUBJECT_EXPR} = $${values.length}`);
  }

  if (filters.term?.trim()) {
    values.push(filters.term.trim());
    where.push(`c.term = $${values.length}`);
  }

  const normalizedSearch = normalizeSearchTerm(filters.search);
  if (normalizedSearch) {
    values.push(`%${normalizedSearch}%`);
    const p = `$${values.length}`;
    where.push(`(c.title ILIKE ${p} OR c.source_course_id ILIKE ${p})`);
  }

  return {
    whereSql: where.length > 0 ? `WHERE ${where.join(" AND ")}` : "",
    values,
  };
}

function normalizeSearchTerm(value: string | undefined) {
  if (!value) return "";
  return value
    .replace(/[%]/g, "")
    .replace(/[.,:()'"`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getPgErrorCode(error: unknown): string | null {
  return !!error && typeof error === "object" && "code" in error
    ? ((error as { code?: string }).code ?? null)
    : null;
}

function isMissingRelationError(error: unknown) {
  return getPgErrorCode(error) === "42P01";
}

function isMissingColumnError(error: unknown) {
  return getPgErrorCode(error) === "42703";
}

function isMissingSchemaDependencyError(error: unknown) {
  return isMissingRelationError(error) || isMissingColumnError(error);
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

type AuditEventQueryRow = {
  id: string;
  from_status: string | null;
  to_status: string;
  note: string | null;
  // node-postgres returns `timestamp`/`timestamptz` columns as JS `Date`
  // objects, so the raw row reflects that rather than the contract's `string`.
  created_at: Date | string;
  actor_role: string;
  course_id: string;
  course_title: string | null;
  actor_name: string | null;
  actor_email: string | null;
  on_behalf_of_name: string | null;
};

// Shared SELECT/JOINs for audit events (newest-first ordering applied by callers).
const AUDIT_EVENT_FROM_SQL = `
  SELECT
    e.id,
    e.from_status,
    e.to_status,
    e.note,
    e.created_at,
    e.actor_role,
    c.id AS course_id,
    c.title AS course_title,
    p.full_name AS actor_name,
    p.email AS actor_email,
    ob.full_name AS on_behalf_of_name
  FROM course_status_events e
  LEFT JOIN courses c ON c.id = e.course_id
  LEFT JOIN profiles p ON p.id = e.actor_id
  LEFT JOIN profiles ob ON ob.id = e.acting_on_behalf_of
`;

const AUDIT_EVENT_FROM_LEGACY_SQL = `
  SELECT
    e.id,
    e.from_status,
    e.to_status,
    e.note,
    e.created_at,
    e.actor_role,
    c.id AS course_id,
    c.title AS course_title,
    p.full_name AS actor_name,
    p.email AS actor_email,
    NULL::text AS on_behalf_of_name
  FROM course_status_events e
  LEFT JOIN courses c ON c.id = e.course_id
  LEFT JOIN profiles p ON p.id = e.actor_id
`;

/**
 * Coerce a Postgres timestamp value to an ISO-8601 string.
 *
 * node-postgres parses `timestamp`/`timestamptz` columns into JS `Date`
 * objects, but our contracts (and downstream consumers such as date-fns
 * `parseISO`) expect ISO strings. Normalizing here keeps the data layer
 * honest about its declared `string` types and prevents
 * `e.split is not a function` crashes in string-only date parsers.
 */
export function toIsoTimestamp(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

export function mapAuditEventRow(row: AuditEventQueryRow): AuditEvent {
  return {
    id: row.id,
    course_id: row.course_id,
    course_title: row.course_title ?? "—",
    from_status: row.from_status,
    to_status: row.to_status,
    actor_name: row.actor_name,
    actor_email: row.actor_email ?? "",
    actor_role: row.actor_role,
    on_behalf_of_name: row.on_behalf_of_name,
    note: row.note,
    created_at: toIsoTimestamp(row.created_at),
  };
}

export function createPostgresCourseRepository(): CourseRepository {
  return {
    async listAccessibleCourses() {
      const pool = getPostgresPool();
      const { rows } = await pool.query<CourseRow>(
        `
          SELECT id, source_course_id, target_course_id, title, term, department, org_unit_id, status, created_by, created_at, updated_at
          FROM courses
          ORDER BY updated_at DESC
        `,
      );
      return rows.map(toCourseSummary);
    },

    async listAssignedCourses(userId, assignmentRole, filters = {}) {
      const pool = getPostgresPool();
      const values: unknown[] = [userId, assignmentRole];
      let statusFilter = "";
      if (filters.statuses?.length) {
        values.push([...filters.statuses]);
        statusFilter = `AND c.status = ANY($${values.length}::text[])`;
      }
      const { rows } = await pool.query<CourseRow>(
        `
          SELECT c.id, c.source_course_id, c.target_course_id, c.title, c.term, c.department, c.org_unit_id, c.status, c.created_by, c.created_at, c.updated_at
          FROM courses c
          INNER JOIN course_assignments ca ON ca.course_id = c.id
          WHERE ca.profile_id = $1 AND ca.role = $2 ${statusFilter}
          ORDER BY c.updated_at DESC
        `,
        values,
      );
      return rows.map(toCourseSummary);
    },

    async listAccessibleCoursesPage(page, pageSize, filters) {
      const pool = getPostgresPool();
      const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
      const safePageSize = Number.isFinite(pageSize) ? Math.max(1, Math.floor(pageSize)) : 20;
      const offset = (safePage - 1) * safePageSize;
      const { whereSql, values } = buildAccessibleWhere(filters);

      const countResult = await pool.query<{ total: string }>(
        `SELECT COUNT(*)::text AS total FROM courses c ${whereSql}`,
        values,
      );
      const total = Number(countResult.rows[0]?.total ?? "0");

      values.push(safePageSize);
      values.push(offset);
      const limitParam = `$${values.length - 1}`;
      const offsetParam = `$${values.length}`;

      const { rows } = await pool.query<CourseRow>(
        `
          SELECT c.id, c.source_course_id, c.target_course_id, c.title, c.term, c.department, c.org_unit_id, c.status, c.created_by, c.created_at, c.updated_at
          FROM courses c
          ${whereSql}
          ORDER BY c.updated_at DESC
          LIMIT ${limitParam} OFFSET ${offsetParam}
        `,
        values,
      );

      return {
        data: rows.map(toCourseSummary),
        total,
        page: safePage,
        pageSize: safePageSize,
        totalPages: safePageSize > 0 ? Math.ceil(total / safePageSize) : 0,
      } satisfies PaginatedResult<CourseSummary>;
    },

    async getAccessibleCourseAggregates(scope: AccessibleCourseScope, filters = {}) {
      const pool = getPostgresPool();
      // Status counts respect the active search/subject/term filters so the tab
      // badges reflect what the user would see when they switch tabs. Subjects
      // and terms are scoped to the user's accessible set only (no search/term/
      // subject filter) — same UX as the previous "all subjects derived from the
      // loaded list" behaviour, just sourced from a DB query.
      const fullFilters: AccessibleCourseListFilters = { scope, ...filters };
      const scopeOnly: AccessibleCourseListFilters = { scope };

      const { whereSql, values } = buildAccessibleWhere(fullFilters, "status");
      const scopeWhere = buildAccessibleWhere(scopeOnly);

      const [statusCountsResult, subjectsResult, termsResult, totalResult] = await Promise.all([
        pool.query<{ status: string; count: string }>(
          `SELECT c.status, COUNT(*)::text AS count FROM courses c ${whereSql} GROUP BY c.status`,
          values,
        ),
        pool.query<{ subject: string | null }>(
          `
            SELECT DISTINCT ${SUBJECT_EXPR} AS subject
            FROM courses c
            ${scopeWhere.whereSql}
            ${scopeWhere.whereSql ? "AND" : "WHERE"} c.source_course_id ~ '^[A-Za-z]'
            ORDER BY subject
          `,
          scopeWhere.values,
        ),
        pool.query<{ term: string | null }>(
          `
            SELECT DISTINCT c.term
            FROM courses c
            ${scopeWhere.whereSql}
            ${scopeWhere.whereSql ? "AND" : "WHERE"} c.term IS NOT NULL AND c.term <> ''
            ORDER BY c.term
          `,
          scopeWhere.values,
        ),
        pool.query<{ total: string }>(
          `SELECT COUNT(*)::text AS total FROM courses c ${whereSql}`,
          values,
        ),
      ]);

      const statusCounts: Partial<Record<CourseStatus, number>> = {};
      for (const row of statusCountsResult.rows) {
        statusCounts[toCourseStatus(row.status)] = Number(row.count);
      }

      return {
        statusCounts,
        subjects: subjectsResult.rows.map((r) => r.subject).filter((s): s is string => !!s),
        terms: termsResult.rows.map((r) => r.term).filter((t): t is string => !!t),
        total: Number(totalResult.rows[0]?.total ?? "0"),
      } satisfies AccessibleCourseAggregates;
    },

    async getAssignedCourseById(courseId, userId, assignmentRole) {
      const pool = getPostgresPool();
      const { rows } = await pool.query<CourseRow>(
        `
          SELECT c.id, c.source_course_id, c.target_course_id, c.title, c.term, c.department, c.org_unit_id, c.status, c.created_by, c.created_at, c.updated_at
          FROM courses c
          INNER JOIN course_assignments ca ON ca.course_id = c.id
          WHERE c.id = $1 AND ca.profile_id = $2 AND ca.role = $3
          LIMIT 1
        `,
        [courseId, userId, assignmentRole],
      );
      return rows[0] ? toCourseSummary(rows[0]) : null;
    },

    async createCourse(input: CreateCourseRecordInput) {
      const pool = getPostgresPool();
      const { rows } = await pool.query<CourseRow>(
        `
          INSERT INTO courses (source_course_id, target_course_id, title, term, department, org_unit_id, status, created_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id, source_course_id, target_course_id, title, term, department, org_unit_id, status, created_by, created_at, updated_at
        `,
        [
          cleanOptionalText(input.sourceCourseId),
          cleanOptionalText(input.targetCourseId),
          input.title,
          cleanOptionalText(input.term),
          cleanOptionalText(input.department),
          input.orgUnitId ?? null,
          input.status,
          input.createdBy,
        ],
      );
      return toCourseSummary(rows[0]);
    },

    async getCourseSummaryById(courseId) {
      const pool = getPostgresPool();
      const { rows } = await pool.query<CourseRow>(
        `
          SELECT id, source_course_id, target_course_id, title, term, department, org_unit_id, status, created_by, created_at, updated_at
          FROM courses
          WHERE id = $1
          LIMIT 1
        `,
        [courseId],
      );
      if (!rows[0]) throw new Error("Could not load course: not found");
      return toCourseSummary(rows[0]);
    },

    async updateCourseStatus(courseId, status) {
      const pool = getPostgresPool();
      const { rows } = await pool.query<CourseRow>(
        `
          UPDATE courses
          SET status = $2, updated_at = NOW()
          WHERE id = $1
          RETURNING id, source_course_id, target_course_id, title, term, department, org_unit_id, status, created_by, created_at, updated_at
        `,
        [courseId, status],
      );
      if (!rows[0]) throw new Error("Could not update course status: not found");
      return toCourseSummary(rows[0]);
    },

    async updateCourseOrgUnit(courseId, orgUnitId) {
      const pool = getPostgresPool();
      let department: string | null = null;
      if (orgUnitId) {
        const { rows } = await pool.query<{ name: string }>(
          `SELECT name FROM organizational_units WHERE id = $1 LIMIT 1`,
          [orgUnitId],
        );
        department = rows[0]?.name ?? null;
      }

      await pool.query(
        `
          UPDATE courses
          SET org_unit_id = $2,
              department = $3,
              updated_at = NOW()
          WHERE id = $1
        `,
        [courseId, orgUnitId, department],
      );
    },

    async getCourseAssignment(courseId, profileId) {
      const pool = getPostgresPool();
      const { rows } = await pool.query<{ course_id: string; profile_id: string; role: AssignmentRole }>(
        `
          SELECT course_id, profile_id, role
          FROM course_assignments
          WHERE course_id = $1 AND profile_id = $2
          LIMIT 1
        `,
        [courseId, profileId],
      );
      const row = rows[0];
      if (!row) return null;
      return {
        courseId: row.course_id,
        profileId: row.profile_id,
        role: row.role,
      } satisfies CourseAssignmentRecord;
    },

    async hasAssignment(courseId, profileId, role) {
      const pool = getPostgresPool();
      const { rows } = await pool.query<{ id: string }>(
        `
          SELECT id
          FROM course_assignments
          WHERE course_id = $1 AND profile_id = $2 AND role = $3
          LIMIT 1
        `,
        [courseId, profileId, role],
      );
      return rows.length > 0;
    },

    async assignUserToCourse(input) {
      const pool = getPostgresPool();
      await pool.query(
        `
          INSERT INTO course_assignments (course_id, profile_id, role, assigned_by)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (course_id, profile_id, role)
          DO UPDATE SET assigned_by = EXCLUDED.assigned_by
        `,
        [input.courseId, input.profileId, input.role, input.assignedBy],
      );
    },

    async reassignCourseStaff(input) {
      // Mirrors the Supabase repo's `reassign_course_staff` RPC. The function
      // swaps the active staff assignment and records the trace atomically.
      const pool = getPostgresPool();
      await pool.query(
        `SELECT reassign_course_staff($1::uuid, $2::uuid, $3::uuid, $4) AS ok`,
        [input.courseId, input.newProfileId, input.actorId, input.reason],
      );
    },

    async insertStatusEvent(input: InsertStatusEventInput) {
      const pool = getPostgresPool();
      await pool.query(
        `
          INSERT INTO course_status_events (course_id, from_status, to_status, actor_id, actor_role, note, acting_on_behalf_of)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          input.courseId,
          input.fromStatus,
          input.toStatus,
          input.actorId,
          input.actorRole,
          cleanOptionalText(input.note),
          input.actingOnBehalfOf ?? null,
        ],
      );
    },

    async listAdminCourses() {
      const pool = getPostgresPool();
      const { rows } = await pool.query<AdminCourseJoinRow>(
        `
          SELECT
            c.id,
            c.source_course_id,
            c.target_course_id,
            c.title,
            c.term,
            c.department,
            c.org_unit_id,
            c.status,
            c.updated_at,
            ta.id AS ta_id,
            ta.full_name AS ta_name,
            ta.email AS ta_email,
            instr.id AS instructor_id,
            instr.full_name AS instructor_name,
            instr.email AS instructor_email
          FROM courses c
          ${ADMIN_COURSE_STAFF_JOIN}
          ${ADMIN_COURSE_INSTRUCTOR_JOIN}
          ORDER BY c.updated_at DESC
        `,
      );

      return rows.map(mapAdminCourseRow);
    },

    async listAdminCoursesPage(page = 1, pageSize = 50, filters: AdminCourseListFilters = {}) {
      const pool = getPostgresPool();
      const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
      const safePageSize = Number.isFinite(pageSize) ? Math.max(1, Math.floor(pageSize)) : 50;
      const offset = (safePage - 1) * safePageSize;
      const normalizedSearch = normalizeSearchTerm(filters.search);
      const values: unknown[] = [];
      const where: string[] = [];

      // `statuses` (whole-phase filter) takes precedence over a single `status`.
      if (filters.statuses && filters.statuses.length > 0) {
        values.push([...filters.statuses]);
        where.push(`c.status = ANY($${values.length}::text[])`);
      } else if (filters.status) {
        values.push(filters.status);
        where.push(`c.status = $${values.length}`);
      }

      if (filters.assignedOnly) {
        where.push(
          `EXISTS (SELECT 1 FROM course_assignments ca WHERE ca.course_id = c.id AND ca.role = 'staff')`,
        );
      }

      if (filters.taProfileId?.trim()) {
        values.push(filters.taProfileId.trim());
        where.push(
          `EXISTS (SELECT 1 FROM course_assignments ca WHERE ca.course_id = c.id AND ca.role = 'staff' AND ca.profile_id = $${values.length})`,
        );
      }

      if (normalizedSearch) {
        values.push(`%${normalizedSearch}%`);
        const searchParam = `$${values.length}`;
        where.push(`(
          c.title ILIKE ${searchParam}
          OR c.source_course_id ILIKE ${searchParam}
          OR c.target_course_id ILIKE ${searchParam}
          OR c.term ILIKE ${searchParam}
          OR c.department ILIKE ${searchParam}
          OR EXISTS (
            SELECT 1
            FROM course_assignments ca
            INNER JOIN profiles p ON p.id = ca.profile_id
            WHERE ca.course_id = c.id
              AND ca.role = 'staff'
              AND p.role = 'standard_user'
              AND (p.full_name ILIKE ${searchParam} OR p.email ILIKE ${searchParam})
          )
        )`);
      }

      const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
      const countQuery = `SELECT COUNT(*)::text AS total FROM courses c ${whereSql}`;
      const countResult = await pool.query<{ total: string }>(countQuery, values);
      const total = Number(countResult.rows[0]?.total ?? "0");

      values.push(safePageSize);
      values.push(offset);
      const limitParam = `$${values.length - 1}`;
      const offsetParam = `$${values.length}`;

      const dataQuery = `
        SELECT
          c.id,
          c.source_course_id,
          c.target_course_id,
          c.title,
          c.term,
          c.department,
          c.org_unit_id,
          c.status,
          c.updated_at,
          ta.id AS ta_id,
          ta.full_name AS ta_name,
          ta.email AS ta_email,
          instr.id AS instructor_id,
          instr.full_name AS instructor_name,
          instr.email AS instructor_email
        FROM courses c
        ${ADMIN_COURSE_STAFF_JOIN}
        ${ADMIN_COURSE_INSTRUCTOR_JOIN}
        ${whereSql}
        ORDER BY c.updated_at DESC
        LIMIT ${limitParam} OFFSET ${offsetParam}
      `;

      const { rows } = await pool.query<AdminCourseJoinRow>(dataQuery, values);

      return {
        data: rows.map(mapAdminCourseRow),
        total,
        page: safePage,
        pageSize: safePageSize,
        totalPages: Math.ceil(total / safePageSize),
      } satisfies PaginatedResult<AdminCourseRow>;
    },

    async getAdminCourse(courseId) {
      const pool = getPostgresPool();
      const { rows } = await pool.query<AdminCourseJoinRow>(
        `
          SELECT
            c.id,
            c.source_course_id,
            c.target_course_id,
            c.title,
            c.term,
            c.department,
            c.org_unit_id,
            c.status,
            c.updated_at,
            c.instructor_summary_notes,
            ta.id AS ta_id,
            ta.full_name AS ta_name,
            ta.email AS ta_email,
            instr.id AS instructor_id,
            instr.full_name AS instructor_name,
            instr.email AS instructor_email
          FROM courses c
          ${ADMIN_COURSE_STAFF_JOIN}
          ${ADMIN_COURSE_INSTRUCTOR_JOIN}
          WHERE c.id = $1
          LIMIT 1
        `,
        [courseId],
      );

      const row = rows[0];
      if (!row) return null;
      return mapAdminCourseRow(row);
    },

    async listSuperAdminCourses(page = 1, pageSize = 20, search = "") {
      const pool = getPostgresPool();
      const safePage = Math.max(1, Math.floor(page));
      const safePageSize = Math.max(1, Math.floor(pageSize));
      const offset = (safePage - 1) * safePageSize;

      const values: unknown[] = [];
      let whereSql = "";
      if (search.trim()) {
        values.push(`%${search.trim()}%`);
        whereSql = `WHERE c.title ILIKE $1 OR c.status ILIKE $1`;
      }

      const countQuery = `SELECT COUNT(*)::text AS total FROM courses c ${whereSql}`;
      const countResult = await pool.query<{ total: string }>(countQuery, values);
      const total = Number(countResult.rows[0]?.total ?? "0");

      values.push(safePageSize, offset);
      const limitParam = `$${values.length - 1}`;
      const offsetParam = `$${values.length}`;

      const dataQuery = `
        SELECT
          c.id,
          c.source_course_id,
          c.target_course_id,
          c.title,
          c.status,
          c.term,
          c.department,
          c.created_at,
          c.updated_at,
          ta.full_name AS ta_name,
          ta.email AS ta_email,
          instructor.full_name AS instructor_name,
          instructor.email AS instructor_email
        FROM courses c
        LEFT JOIN LATERAL (
          SELECT p.full_name, p.email
          FROM course_assignments ca
          INNER JOIN profiles p ON p.id = ca.profile_id
          WHERE ca.course_id = c.id AND ca.role = 'staff'
          ORDER BY ca.assigned_at DESC
          LIMIT 1
        ) ta ON TRUE
        LEFT JOIN LATERAL (
          SELECT p.full_name, p.email
          FROM course_assignments ca
          INNER JOIN profiles p ON p.id = ca.profile_id
          WHERE ca.course_id = c.id AND ca.role = 'instructor'
          ORDER BY ca.assigned_at DESC
          LIMIT 1
        ) instructor ON TRUE
        ${whereSql}
        ORDER BY c.updated_at DESC
        LIMIT ${limitParam} OFFSET ${offsetParam}
      `;

      const { rows } = await pool.query<{
        id: string;
        source_course_id: string | null;
        target_course_id: string | null;
        title: string;
        status: string;
        term: string | null;
        department: string | null;
        created_at: string;
        updated_at: string;
        ta_name: string | null;
        ta_email: string | null;
        instructor_name: string | null;
        instructor_email: string | null;
      }>(dataQuery, values);

      return {
        data: rows.map((row) => ({
          id: row.id,
          code: row.source_course_id ?? row.target_course_id ?? null,
          title: row.title,
          status: toCourseStatus(row.status),
          term: row.term,
          department: row.department,
          created_at: row.created_at,
          updated_at: row.updated_at,
          ta: row.ta_email ? { name: row.ta_name, email: row.ta_email } : null,
          instructor: row.instructor_email
            ? { name: row.instructor_name, email: row.instructor_email }
            : null,
        })) satisfies SuperAdminCourseRow[],
        total,
        page: safePage,
        pageSize: safePageSize,
        totalPages: Math.ceil(total / safePageSize),
      };
    },

    async countCourses() {
      const pool = getPostgresPool();
      const { rows } = await pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM courses`);
      return Number(rows[0]?.count ?? "0");
    },

    async listStatusCounts() {
      const pool = getPostgresPool();
      try {
        const { rows } = await pool.query<{ status: string; count: number | string }>(
          `SELECT status, count FROM course_status_counts`,
        );
        return rows.map((row) => ({
          status: toCourseStatus(row.status),
          count: Number(row.count),
        })) satisfies StatusCount[];
      } catch (error) {
        if (!isMissingRelationError(error)) throw error;
        return fallbackStatusCounts();
      }
    },

    async listStuckCourses(cutoffIso, limit = 50) {
      const pool = getPostgresPool();
      const safeLimit = Math.max(1, Math.min(500, Math.floor(limit)));
      const { rows } = await pool.query<{
        id: string;
        title: string;
        status: string;
        updated_at: string;
      }>(
        `
          SELECT id, title, status, updated_at
          FROM courses
          WHERE status <> 'final_approved'
            AND updated_at < $1::timestamptz
          ORDER BY updated_at ASC
          LIMIT $2
        `,
        [cutoffIso, safeLimit],
      );

      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        status: toCourseStatus(row.status),
        days_stuck: Math.floor((Date.now() - new Date(row.updated_at).getTime()) / 86_400_000),
        updated_at: row.updated_at,
      })) satisfies StuckCourse[];
    },

    async countStuckCourses(cutoffIso) {
      const pool = getPostgresPool();
      const { rows } = await pool.query<{ count: string }>(
        `
          SELECT COUNT(*)::text AS count
          FROM courses
          WHERE status <> 'final_approved'
            AND updated_at < $1::timestamptz
        `,
        [cutoffIso],
      );
      return Number(rows[0]?.count ?? "0");
    },

    async listTAWorkload() {
      const pool = getPostgresPool();
      try {
        const { rows } = await pool.query<{
          profile_id: string;
          full_name: string | null;
          email: string;
          active_courses: number | string;
          needs_fixes: number | string;
        }>(
          `
            SELECT profile_id, full_name, email, active_courses, needs_fixes
            FROM ta_workload_stats
            ORDER BY full_name ASC
          `,
        );

        return rows.map((row) => ({
          id: row.profile_id,
          full_name: row.full_name,
          email: row.email,
          active_courses: Number(row.active_courses),
          needs_fixes: Number(row.needs_fixes),
        })) satisfies TAWorkload[];
      } catch (error) {
        if (!isMissingRelationError(error)) throw error;
        return fallbackTAWorkload();
      }
    },

    async listAuditEvents(limit) {
      const pool = getPostgresPool();
      try {
        const { rows } = await pool.query<AuditEventQueryRow>(
          `${AUDIT_EVENT_FROM_SQL} ORDER BY e.created_at DESC LIMIT $1`,
          [limit],
        );

        return rows.map(mapAuditEventRow);
      } catch (error) {
        if (!isMissingSchemaDependencyError(error)) throw error;

        const { rows } = await pool.query<AuditEventQueryRow>(
          `${AUDIT_EVENT_FROM_LEGACY_SQL} ORDER BY e.created_at DESC LIMIT $1`,
          [limit],
        );
        return rows.map(mapAuditEventRow);
      }
    },

    async listAuditEventsPage(page, pageSize) {
      const pool = getPostgresPool();
      const safePage = Math.max(1, Math.floor(page));
      const offset = (safePage - 1) * pageSize;

      try {
        const [countResult, pageResult] = await Promise.all([
          pool.query<{ total: string }>(
            `SELECT COUNT(*)::text AS total FROM course_status_events`,
          ),
          pool.query<AuditEventQueryRow>(
            `${AUDIT_EVENT_FROM_SQL} ORDER BY e.created_at DESC LIMIT $1 OFFSET $2`,
            [pageSize, offset],
          ),
        ]);

        const total = Number(countResult.rows[0]?.total ?? "0");
        return {
          data: pageResult.rows.map(mapAuditEventRow),
          total,
          page: safePage,
          pageSize,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
        };
      } catch (error) {
        if (!isMissingSchemaDependencyError(error)) throw error;

        const [countResult, pageResult] = await Promise.all([
          pool.query<{ total: string }>(
            `SELECT COUNT(*)::text AS total FROM course_status_events`,
          ),
          pool.query<AuditEventQueryRow>(
            `${AUDIT_EVENT_FROM_LEGACY_SQL} ORDER BY e.created_at DESC LIMIT $1 OFFSET $2`,
            [pageSize, offset],
          ),
        ]);

        const total = Number(countResult.rows[0]?.total ?? "0");
        return {
          data: pageResult.rows.map(mapAuditEventRow),
          total,
          page: safePage,
          pageSize,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
        };
      }
    },

    async listCourseStatusEvents(courseId) {
      const pool = getPostgresPool();
      const { rows } = await pool.query<{
        id: string;
        from_status: string | null;
        to_status: string;
        note: string | null;
        created_at: string;
        actor_role: string;
        course_id: string | null;
        course_title: string | null;
        actor_name: string | null;
        actor_email: string | null;
        on_behalf_of_name: string | null;
      }>(
        `
          SELECT
            e.id,
            e.from_status,
            e.to_status,
            e.note,
            e.created_at,
            e.actor_role,
            c.id AS course_id,
            c.title AS course_title,
            p.full_name AS actor_name,
            p.email AS actor_email,
            ob.full_name AS on_behalf_of_name
          FROM course_status_events e
          LEFT JOIN courses c ON c.id = e.course_id
          LEFT JOIN profiles p ON p.id = e.actor_id
          LEFT JOIN profiles ob ON ob.id = e.acting_on_behalf_of
          WHERE e.course_id = $1
          ORDER BY e.created_at ASC
        `,
        [courseId],
      );

      return rows.map((row) => ({
        id: row.id,
        course_id: row.course_id ?? courseId,
        course_title: row.course_title ?? "—",
        from_status: row.from_status,
        to_status: row.to_status,
        actor_name: row.actor_name,
        actor_email: row.actor_email ?? "",
        actor_role: row.actor_role,
        on_behalf_of_name: row.on_behalf_of_name,
        note: row.note,
        created_at: row.created_at,
      })) satisfies AuditEvent[];
    },

    async listCourseAuditEntries(courseId): Promise<CourseAuditEntry[]> {
      const pool = getPostgresPool();
      type AuditRow = {
        id: string;
        table_name: CourseAuditEntry["tableName"];
        action: CourseAuditEntry["action"];
        actor_id: string | null;
        old_data: Record<string, unknown> | null;
        new_data: Record<string, unknown> | null;
        changed_at: string;
      };

      let rows: AuditRow[];
      try {
        const result = await pool.query<AuditRow>(
          `
            SELECT id, table_name, action, actor_id, old_data, new_data, changed_at
            FROM audit_log
            WHERE course_id = $1
              AND table_name = ANY($2::text[])
            ORDER BY changed_at ASC
          `,
          [
            courseId,
            ["course_assignments", "course_escalations", "escalation_messages", "course_issue_comments"],
          ],
        );
        rows = result.rows;
      } catch (error) {
        // The audit_log table may not exist yet (migration not applied). Degrade
        // gracefully so the timeline never hard-fails — 42P01 is undefined_table.
        if (!isMissingRelationError(error)) {
          console.warn(`listCourseAuditEntries: audit_log read failed: ${(error as Error).message}`);
        }
        return [];
      }

      // Resolve referenced profile ids (actor + assignment target) to display
      // names in one batched lookup.
      const ids = new Set<string>();
      for (const r of rows) {
        if (r.actor_id) ids.add(r.actor_id);
        const pid = (r.new_data ?? r.old_data)?.["profile_id"];
        if (typeof pid === "string") ids.add(pid);
      }
      const nameById = new Map<string, string | null>();
      if (ids.size > 0) {
        const { rows: profs } = await pool.query<{ id: string; full_name: string | null; email: string }>(
          `SELECT id, full_name, email FROM profiles WHERE id = ANY($1::uuid[])`,
          [[...ids]],
        );
        for (const p of profs) {
          nameById.set(p.id, p.full_name ?? p.email ?? null);
        }
      }

      return rows.map((r) => {
        const d = (r.new_data ?? r.old_data ?? {}) as Record<string, unknown>;
        const targetId = nonEmptyString(d["profile_id"]);
        return {
          id: r.id,
          tableName: r.table_name,
          action: r.action,
          at: r.changed_at,
          actorName: r.actor_id ? (nameById.get(r.actor_id) ?? null) : null,
          role: nonEmptyString(d["role"]),
          targetName: targetId ? (nameById.get(targetId) ?? null) : null,
          title: nonEmptyString(d["title"]),
          body: nonEmptyString(d["body"]),
          status: nonEmptyString(d["status"]),
          isSystem: d["is_system_message"] === true,
        } satisfies CourseAuditEntry;
      });
    },

    async listSubmissionHistory(courseId) {
      return listStatusHistory(courseId, "submitted_to_admin");
    },

    async listChangeRequestHistory(courseId) {
      return listStatusHistory(courseId, "admin_changes_requested");
    },

    async listQuestionRoundHistory(courseId) {
      return listStatusHistory(courseId, "instructor_questions");
    },

    async listRecentAssignments(limit) {
      const pool = getPostgresPool();
      const { rows } = await pool.query<{
        id: string;
        course_id: string;
        role: AssignmentRole;
        assigned_at: string;
        course_title: string | null;
        assigned_user_name: string | null;
        assigned_user_email: string | null;
        assigner_name: string | null;
        assigner_email: string | null;
      }>(
        `
          SELECT
            ca.id,
            ca.course_id,
            ca.role,
            ca.assigned_at,
            c.title AS course_title,
            pu.full_name AS assigned_user_name,
            pu.email AS assigned_user_email,
            pb.full_name AS assigner_name,
            pb.email AS assigner_email
          FROM course_assignments ca
          LEFT JOIN courses c ON c.id = ca.course_id
          LEFT JOIN profiles pu ON pu.id = ca.profile_id
          LEFT JOIN profiles pb ON pb.id = ca.assigned_by
          ORDER BY ca.assigned_at DESC
          LIMIT $1
        `,
        [limit],
      );

      return rows.map((row) => ({
        id: row.id,
        courseId: row.course_id,
        courseTitle: row.course_title ?? "—",
        assignedUser: {
          name: row.assigned_user_name,
          email: row.assigned_user_email ?? "—",
        },
        role: row.role,
        assignedBy: {
          name: row.assigner_name,
          email: row.assigner_email ?? "—",
        },
        assignedAt: row.assigned_at,
      })) satisfies AssignmentLog[];
    },

    async listCoursesByUnitAncestry(unitIds) {
      if (unitIds.length === 0) {
        return [];
      }

      const pool = getPostgresPool();
      const { rows } = await pool.query<CourseRow>(
        `
          SELECT DISTINCT c.id, c.source_course_id, c.target_course_id, c.title, c.term, c.department,
                 c.org_unit_id, ou.name AS org_unit_name, c.status, c.created_by, c.created_at, c.updated_at
          FROM courses c
          INNER JOIN org_unit_hierarchy_paths hp ON hp.descendant_id = c.org_unit_id
          LEFT JOIN organizational_units ou ON ou.id = c.org_unit_id
          WHERE hp.ancestor_id = ANY($1::uuid[])
          ORDER BY c.updated_at DESC
        `,
        [unitIds],
      );

      return rows.map(toCourseSummary);
    },

    async listCoursesByUnit(unitId, page = 1, pageSize = 50, filters: UnitCourseListFilters = {}) {
      const pool = getPostgresPool();
      const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
      const safePageSize = Number.isFinite(pageSize) ? Math.max(1, Math.floor(pageSize)) : 50;
      const offset = (safePage - 1) * safePageSize;
      const normalizedSearch = normalizeSearchTerm(filters.search);

      // Scope to the unit's whole subtree via the recursive paths view (each unit
      // is its own descendant at depth 0).
      const values: unknown[] = [unitId];
      const where: string[] = [
        `c.org_unit_id IN (SELECT descendant_id FROM org_unit_hierarchy_paths WHERE ancestor_id = $1)`,
      ];

      if (filters.status) {
        values.push(filters.status);
        where.push(`c.status = $${values.length}`);
      }

      if (filters.term) {
        values.push(filters.term);
        where.push(`c.term = $${values.length}`);
      }

      if (normalizedSearch) {
        values.push(`%${normalizedSearch}%`);
        const searchParam = `$${values.length}`;
        where.push(`(
          c.title ILIKE ${searchParam}
          OR c.source_course_id ILIKE ${searchParam}
          OR c.target_course_id ILIKE ${searchParam}
          OR c.term ILIKE ${searchParam}
          OR c.department ILIKE ${searchParam}
          OR EXISTS (
            SELECT 1
            FROM course_assignments ca
            INNER JOIN profiles p ON p.id = ca.profile_id
            WHERE ca.course_id = c.id
              AND ca.role = 'staff'
              AND p.role = 'standard_user'
              AND (p.full_name ILIKE ${searchParam} OR p.email ILIKE ${searchParam})
          )
        )`);
      }

      const whereSql = `WHERE ${where.join(" AND ")}`;
      const countResult = await pool.query<{ total: string }>(
        `SELECT COUNT(*)::text AS total FROM courses c ${whereSql}`,
        values,
      );
      const total = Number(countResult.rows[0]?.total ?? "0");

      values.push(safePageSize);
      values.push(offset);
      const limitParam = `$${values.length - 1}`;
      const offsetParam = `$${values.length}`;

      const { rows } = await pool.query<AdminCourseJoinRow>(
        `
          SELECT
            c.id,
            c.source_course_id,
            c.target_course_id,
            c.title,
            c.term,
            c.department,
            c.org_unit_id,
            c.status,
            c.updated_at,
            ta.id AS ta_id,
            ta.full_name AS ta_name,
            ta.email AS ta_email,
            instr.id AS instructor_id,
            instr.full_name AS instructor_name,
            instr.email AS instructor_email
          FROM courses c
          ${ADMIN_COURSE_STAFF_JOIN}
          ${ADMIN_COURSE_INSTRUCTOR_JOIN}
          ${whereSql}
          ORDER BY c.updated_at DESC
          LIMIT ${limitParam} OFFSET ${offsetParam}
        `,
        values,
      );

      return {
        data: rows.map(mapAdminCourseRow),
        total,
        page: safePage,
        pageSize: safePageSize,
        totalPages: Math.ceil(total / safePageSize),
      } satisfies PaginatedResult<AdminCourseRow>;
    },

    async getUnitCourseFacets(unitId) {
      const pool = getPostgresPool();

      const [statusRows, termRows, totalRow] = await Promise.all([
        pool.query<{ status: string; count: string }>(
          `
            SELECT c.status, COUNT(*)::text AS count
            FROM courses c
            WHERE c.org_unit_id IN (
              SELECT descendant_id FROM org_unit_hierarchy_paths WHERE ancestor_id = $1
            )
            GROUP BY c.status
          `,
          [unitId],
        ),
        pool.query<{ term: string }>(
          `
            SELECT DISTINCT TRIM(c.term) AS term
            FROM courses c
            WHERE c.org_unit_id IN (
              SELECT descendant_id FROM org_unit_hierarchy_paths WHERE ancestor_id = $1
            )
              AND c.term IS NOT NULL AND TRIM(c.term) <> ''
            ORDER BY term DESC
          `,
          [unitId],
        ),
        pool.query<{ total: string }>(
          `
            SELECT COUNT(*)::text AS total
            FROM courses c
            WHERE c.org_unit_id IN (
              SELECT descendant_id FROM org_unit_hierarchy_paths WHERE ancestor_id = $1
            )
          `,
          [unitId],
        ),
      ]);

      const countMap = new Map(statusRows.rows.map((r) => [r.status, Number(r.count)]));
      const statusCounts: StatusCount[] = COURSE_STATUSES.filter((s) => countMap.has(s)).map((s) => ({
        status: s,
        count: countMap.get(s) ?? 0,
      }));

      return {
        statusCounts,
        terms: termRows.rows.map((r) => r.term),
        total: Number(totalRow.rows[0]?.total ?? 0),
      } satisfies UnitCourseFacets;
    },

    async getChildUnitCourseCounts(childUnitIds) {
      const result: Record<string, number> = {};
      for (const id of childUnitIds) result[id] = 0;
      if (!childUnitIds.length) return result;

      // Siblings' subtrees are disjoint, so tally each ancestor's subtree courses
      // in a single paths→courses join.
      const pool = getPostgresPool();
      const { rows } = await pool.query<{ ancestor_id: string; count: string }>(
        `
          SELECT hp.ancestor_id, COUNT(c.id)::text AS count
          FROM org_unit_hierarchy_paths hp
          INNER JOIN courses c ON c.org_unit_id = hp.descendant_id
          WHERE hp.ancestor_id = ANY($1::uuid[])
          GROUP BY hp.ancestor_id
        `,
        [childUnitIds],
      );

      for (const row of rows) {
        result[row.ancestor_id] = Number(row.count);
      }
      return result;
    },

    async listInstructorCourses(profileId) {
      const pool = getPostgresPool();
      const { rows } = await pool.query<{
        id: string;
        title: string;
        term: string | null;
        department: string | null;
        status: string;
        updated_at: string;
      }>(
        `
          SELECT c.id, c.title, c.term, c.department, c.status, c.updated_at
          FROM courses c
          INNER JOIN course_assignments ca ON ca.course_id = c.id
          WHERE ca.profile_id = $1
            AND ca.role = 'instructor'
            AND c.status = ANY($2::text[])
          ORDER BY c.updated_at DESC
        `,
        [profileId, ["sent_to_instructor", "instructor_viewing", "instructor_questions", "instructor_approved"]],
      );

      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        term: row.term,
        department: row.department,
        status: toCourseStatus(row.status),
        updatedAt: row.updated_at,
      })) satisfies InstructorCourse[];
    },
  };
}

async function listStatusHistory(courseId: string, toStatus: string): Promise<SubmissionEvent[]> {
  const pool = getPostgresPool();
  const { rows } = await pool.query<{
    id: string;
    note: string | null;
    created_at: string;
    actor_name: string | null;
    actor_email: string | null;
  }>(
    `
      SELECT
        e.id,
        e.note,
        e.created_at,
        p.full_name AS actor_name,
        p.email AS actor_email
      FROM course_status_events e
      LEFT JOIN profiles p ON p.id = e.actor_id
      WHERE e.course_id = $1 AND e.to_status = $2
      ORDER BY e.created_at ASC
    `,
    [courseId, toStatus],
  );

  return rows.map((row) => ({
    id: row.id,
    actorName: row.actor_name,
    actorEmail: row.actor_email ?? "",
    note: row.note,
    createdAt: row.created_at,
  }));
}

async function fallbackStatusCounts(): Promise<StatusCount[]> {
  const pool = getPostgresPool();
  const { rows } = await pool.query<{ status: string }>(`SELECT status FROM courses`);
  const counts = new Map<string, number>();

  for (const row of rows) {
    counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([status, count]) => ({
    status: toCourseStatus(status),
    count,
  }));
}

async function fallbackTAWorkload(): Promise<TAWorkload[]> {
  const pool = getPostgresPool();
  const { rows } = await pool.query<{
    profile_id: string;
    full_name: string | null;
    email: string;
    status: string | null;
  }>(
    `
      SELECT
        ca.profile_id,
        p.full_name,
        p.email,
        c.status
      FROM course_assignments ca
      INNER JOIN profiles p ON p.id = ca.profile_id
      LEFT JOIN courses c ON c.id = ca.course_id
      WHERE ca.role = 'staff'
    `,
  );

  const byProfile = new Map<string, TAWorkload>();
  for (const row of rows) {
    if (!byProfile.has(row.profile_id)) {
      byProfile.set(row.profile_id, {
        id: row.profile_id,
        full_name: row.full_name,
        email: row.email,
        active_courses: 0,
        needs_fixes: 0,
      });
    }

    const entry = byProfile.get(row.profile_id)!;
    if (!row.status) continue;
    if (row.status !== "final_approved") {
      entry.active_courses += 1;
    }
    if (row.status === "admin_changes_requested" || row.status === "instructor_questions") {
      entry.needs_fixes += 1;
    }
  }

  return Array.from(byProfile.values()).sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""));
}
