import "server-only";

import type { QueryResultRow } from "pg";
import type { Role } from "@coursebridge/workflow";
import { getPostgresPool } from "@/lib/postgres/pool";
import type { ProfileRepository } from "@/lib/repositories/contracts";

type ProfileRow = QueryResultRow & {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  created_at?: string | Date;
};

function mapProfile(row: ProfileRow) {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
  };
}

function toIso(value: string | Date | undefined): string {
  if (!value) {
    return new Date(0).toISOString();
  }
  return value instanceof Date ? value.toISOString() : value;
}

export function createPostgresProfileRepository(): ProfileRepository {
  return {
    async getProfileById(profileId) {
      const pool = getPostgresPool();
      const { rows } = await pool.query<ProfileRow>(
        `
          SELECT id, email, full_name, role
          FROM profiles
          WHERE id = $1
          LIMIT 1
        `,
        [profileId],
      );

      return rows[0] ? mapProfile(rows[0]) : null;
    },

    async getProfilesByRole(role) {
      const pool = getPostgresPool();
      const { rows } = await pool.query<ProfileRow>(
        `
          SELECT id, email, full_name, role
          FROM profiles
          WHERE role = $1
          ORDER BY full_name ASC NULLS LAST
        `,
        [role],
      );

      return rows.map(mapProfile);
    },

    async listUsers(page = 1, pageSize = 20, search = "") {
      const pool = getPostgresPool();
      const from = (page - 1) * pageSize;
      const pattern = `%${search.trim()}%`;
      const hasSearch = search.trim().length > 0;

      const usersQuery = hasSearch
        ? pool.query<ProfileRow>(
            `
              SELECT id, email, full_name, role, created_at
              FROM profiles
              WHERE full_name ILIKE $1 OR email ILIKE $1 OR role ILIKE $1
              ORDER BY created_at DESC
              OFFSET $2
              LIMIT $3
            `,
            [pattern, from, pageSize],
          )
        : pool.query<ProfileRow>(
            `
              SELECT id, email, full_name, role, created_at
              FROM profiles
              ORDER BY created_at DESC
              OFFSET $1
              LIMIT $2
            `,
            [from, pageSize],
          );

      const countQuery = hasSearch
        ? pool.query<{ total: string }>(
            `
              SELECT COUNT(*)::text AS total
              FROM profiles
              WHERE full_name ILIKE $1 OR email ILIKE $1 OR role ILIKE $1
            `,
            [pattern],
          )
        : pool.query<{ total: string }>(
            `
              SELECT COUNT(*)::text AS total
              FROM profiles
            `,
          );

      const [usersResult, countResult] = await Promise.all([usersQuery, countQuery]);
      const total = Number(countResult.rows[0]?.total ?? "0");

      return {
        data: usersResult.rows.map((profile) => ({
          id: profile.id,
          email: profile.email,
          fullName: profile.full_name,
          role: profile.role,
          createdAt: toIso(profile.created_at),
        })),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    },

    async upsertProfile(input) {
      const pool = getPostgresPool();
      await pool.query(
        `
          INSERT INTO profiles (id, email, full_name, role)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (id)
          DO UPDATE SET
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            updated_at = NOW()
        `,
        [input.id, input.email, input.fullName, input.role],
      );
    },

    async updateProfileRole(profileId, role) {
      const pool = getPostgresPool();
      await pool.query(
        `
          UPDATE profiles
          SET role = $2,
              updated_at = NOW()
          WHERE id = $1
        `,
        [profileId, role],
      );
    },
  };
}
