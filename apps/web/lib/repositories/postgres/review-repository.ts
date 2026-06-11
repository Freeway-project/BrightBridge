import "server-only";

import type {
  ReviewProgress,
  ReviewRepository,
  ReviewResponse,
  ReviewSection,
  SectionProgress,
} from "@/lib/repositories/contracts";
import { getPostgresPool } from "@/lib/postgres/pool";

type ReviewSectionRow = {
  id: string;
  key: string;
  title: string;
  description: string | null;
  sort_order: number;
};

type ReviewResponseRow = {
  id: string;
  course_id: string;
  section_id: string;
  responded_by: string;
  response_data: Record<string, unknown>;
  status: "draft" | "submitted";
  updated_at: string;
};

function defaultSection(): SectionProgress {
  return { exists: false, status: null, responseData: null };
}

export function createPostgresReviewRepository(): ReviewRepository {
  return {
    async getReviewSectionByKey(key) {
      const pool = getPostgresPool();
      const { rows } = await pool.query<ReviewSectionRow>(
        `
          SELECT id, key, title, description, sort_order
          FROM review_sections
          WHERE key = $1
          LIMIT 1
        `,
        [key],
      );

      const row = rows[0];
      if (!row) {
        return null;
      }

      return {
        id: row.id,
        key: row.key,
        title: row.title,
        description: row.description,
        sort_order: row.sort_order,
      } satisfies ReviewSection;
    },

    async listReviewResponses(courseId) {
      const pool = getPostgresPool();
      const { rows } = await pool.query<ReviewResponseRow>(
        `
          SELECT id, course_id, section_id, responded_by, response_data, status, updated_at
          FROM review_responses
          WHERE course_id = $1
        `,
        [courseId],
      );

      return rows as ReviewResponse[];
    },

    async getReviewResponse(courseId, sectionId) {
      const pool = getPostgresPool();
      const { rows } = await pool.query<ReviewResponseRow>(
        `
          SELECT id, course_id, section_id, responded_by, response_data, status, updated_at
          FROM review_responses
          WHERE course_id = $1 AND section_id = $2
          LIMIT 1
        `,
        [courseId, sectionId],
      );

      return (rows[0] as ReviewResponse | undefined) ?? null;
    },

    async upsertReviewResponse(input) {
      const pool = getPostgresPool();
      const { rows } = await pool.query<ReviewResponseRow>(
        `
          INSERT INTO review_responses (course_id, section_id, responded_by, response_data, status)
          VALUES ($1, $2, $3, $4::jsonb, $5)
          ON CONFLICT (course_id, section_id)
          DO UPDATE SET
            responded_by = EXCLUDED.responded_by,
            response_data = EXCLUDED.response_data,
            status = EXCLUDED.status,
            updated_at = NOW()
          RETURNING id, course_id, section_id, responded_by, response_data, status, updated_at
        `,
        [
          input.courseId,
          input.sectionId,
          input.userId,
          JSON.stringify(input.responseData),
          input.status ?? "draft",
        ],
      );

      return rows[0] as ReviewResponse;
    },

    async markAllResponsesSubmitted(courseId) {
      const pool = getPostgresPool();
      await pool.query(
        `
          UPDATE review_responses
          SET status = 'submitted', updated_at = NOW()
          WHERE course_id = $1
        `,
        [courseId],
      );
    },

    async getReviewProgressForCourses(courseIds) {
      if (courseIds.length === 0) {
        return new Map();
      }

      const pool = getPostgresPool();
      const map = new Map<string, ReviewProgress>(
        courseIds.map((id) => [
          id,
          {
            courseMetadata: defaultSection(),
            reviewMatrix: defaultSection(),
            syllabusReview: defaultSection(),
          },
        ]),
      );

      const { rows } = await pool.query<{
        course_id: string;
        status: "draft" | "submitted";
        response_data: Record<string, unknown>;
        section_key: string;
      }>(
        `
          SELECT rr.course_id, rr.status, rr.response_data, rs.key AS section_key
          FROM review_responses rr
          INNER JOIN review_sections rs ON rs.id = rr.section_id
          WHERE rr.course_id = ANY($1::uuid[])
            AND rs.key = ANY($2::text[])
        `,
        [courseIds, ["course_metadata", "review_matrix", "syllabus_review"]],
      );

      for (const row of rows) {
        const progress = map.get(row.course_id);
        if (!progress) {
          continue;
        }

        const section: SectionProgress = {
          exists: true,
          status: row.status,
          responseData: row.response_data,
        };

        if (row.section_key === "course_metadata") progress.courseMetadata = section;
        if (row.section_key === "review_matrix") progress.reviewMatrix = section;
        if (row.section_key === "syllabus_review") progress.syllabusReview = section;
      }

      return map;
    },

    async getSectionKeyById() {
      const pool = getPostgresPool();
      const { rows } = await pool.query<{ id: string; key: string }>(
        `SELECT id, key FROM review_sections`,
      );

      const sectionKeyById: Record<string, string> = {};
      for (const row of rows) {
        sectionKeyById[row.id] = row.key;
      }

      return sectionKeyById;
    },
  };
}
