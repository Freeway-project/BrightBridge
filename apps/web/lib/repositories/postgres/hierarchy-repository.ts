import "server-only";

import type { HierarchyRepository } from "@/lib/repositories/contracts";
import { getPostgresPool } from "@/lib/postgres/pool";

function isMissingFunctionError(error: unknown) {
  return !!error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "42883";
}

export function createPostgresHierarchyRepository(): HierarchyRepository {
  return {
    async listUnits() {
      const pool = getPostgresPool();
      const { rows } = await pool.query<{
        id: string;
        parent_id: string | null;
        name: string;
        type: string;
      }>(
        `
          SELECT id, parent_id, name, type
          FROM organizational_units
          ORDER BY name ASC
        `,
      );

      return rows.map((row) => ({
        id: row.id,
        parentId: row.parent_id,
        name: row.name,
        type: row.type,
      }));
    },

    async getUnitById(id) {
      const pool = getPostgresPool();
      const { rows } = await pool.query<{
        id: string;
        parent_id: string | null;
        name: string;
        type: string;
      }>(
        `
          SELECT id, parent_id, name, type
          FROM organizational_units
          WHERE id = $1
          LIMIT 1
        `,
        [id],
      );

      const row = rows[0];
      if (!row) {
        return null;
      }

      return {
        id: row.id,
        parentId: row.parent_id,
        name: row.name,
        type: row.type,
      };
    },

    async getUserUnits(profileId) {
      const pool = getPostgresPool();
      const { rows } = await pool.query<{
        id: string;
        profile_id: string;
        org_unit_id: string;
        title: string;
        is_primary: boolean;
      }>(
        `
          SELECT id, profile_id, org_unit_id, title, is_primary
          FROM org_unit_members
          WHERE profile_id = $1
        `,
        [profileId],
      );

      return rows.map((row) => ({
        id: row.id,
        profileId: row.profile_id,
        orgUnitId: row.org_unit_id,
        title: row.title,
        isPrimary: row.is_primary,
      }));
    },

    async listAllMembers() {
      const pool = getPostgresPool();
      const { rows } = await pool.query<{
        id: string;
        profile_id: string;
        org_unit_id: string;
        title: string;
        is_primary: boolean;
      }>(
        `
          SELECT id, profile_id, org_unit_id, title, is_primary
          FROM org_unit_members
        `,
      );

      return rows.map((row) => ({
        id: row.id,
        profileId: row.profile_id,
        orgUnitId: row.org_unit_id,
        title: row.title,
        isPrimary: row.is_primary,
      }));
    },

    async hasHierarchyAccess(profileId, courseId) {
      const pool = getPostgresPool();

      try {
        const { rows } = await pool.query<{ allowed: boolean }>(
          `SELECT check_hierarchy_access($1::uuid, $2::uuid) AS allowed`,
          [profileId, courseId],
        );
        return Boolean(rows[0]?.allowed);
      } catch (error) {
        if (!isMissingFunctionError(error)) {
          throw error;
        }
      }

      const courseResult = await pool.query<{ org_unit_id: string | null }>(
        `
          SELECT org_unit_id
          FROM courses
          WHERE id = $1
          LIMIT 1
        `,
        [courseId],
      );

      const courseOrgUnitId = courseResult.rows[0]?.org_unit_id;
      if (!courseOrgUnitId) {
        return false;
      }

      const userUnits = await this.getUserUnits(profileId);
      if (userUnits.length === 0) {
        return false;
      }

      const { rows: ancestorRows } = await pool.query<{ ancestor_id: string }>(
        `
          SELECT ancestor_id
          FROM org_unit_hierarchy_paths
          WHERE descendant_id = $1
        `,
        [courseOrgUnitId],
      );

      const userUnitSet = new Set(userUnits.map((unit) => unit.orgUnitId));
      return ancestorRows.some((row) => userUnitSet.has(row.ancestor_id));
    },

    async createUnit(input) {
      const pool = getPostgresPool();
      const { rows } = await pool.query<{
        id: string;
        parent_id: string | null;
        name: string;
        type: string;
      }>(
        `
          INSERT INTO organizational_units (name, type, parent_id)
          VALUES ($1, $2, $3)
          RETURNING id, parent_id, name, type
        `,
        [input.name, input.type, input.parentId ?? null],
      );

      const row = rows[0];
      return {
        id: row.id,
        parentId: row.parent_id,
        name: row.name,
        type: row.type,
      };
    },

    async addMember(input) {
      const pool = getPostgresPool();
      await pool.query(
        `
          INSERT INTO org_unit_members (profile_id, org_unit_id, title, is_primary)
          VALUES ($1, $2, $3, $4)
        `,
        [input.profileId, input.orgUnitId, input.title, input.isPrimary ?? true],
      );
    },

    async removeMember(memberId) {
      const pool = getPostgresPool();
      await pool.query(`DELETE FROM org_unit_members WHERE id = $1`, [memberId]);
    },
  };
}
