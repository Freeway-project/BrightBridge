import "server-only";

import type { HierarchyRepository, OrgUnit, OrgUnitMember } from "@/lib/repositories/contracts";
import { getSupabaseAdminClientOrThrow } from "./shared";

export function createSupabaseHierarchyRepository(): HierarchyRepository {
  return {
    async listUnits() {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("organizational_units")
        .select("id, parent_id, name, type")
        .order("name");

      if (error) {
        throw new Error(`listUnits: ${error.message}`);
      }

      return (data ?? []).map((row) => ({
        id: row.id,
        parentId: row.parent_id,
        name: row.name,
        type: row.type,
      }));
    },

    async getUnitById(id) {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("organizational_units")
        .select("id, parent_id, name, type")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        throw new Error(`getUnitById: ${error.message}`);
      }

      if (!data) return null;

      return {
        id: data.id,
        parentId: data.parent_id,
        name: data.name,
        type: data.type,
      };
    },

    async getUserUnits(profileId) {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("org_unit_members")
        .select("id, profile_id, org_unit_id, title, is_primary")
        .eq("profile_id", profileId);

      if (error) {
        throw new Error(`getUserUnits: ${error.message}`);
      }

      return (data ?? []).map((row) => ({
        id: row.id,
        profileId: row.profile_id,
        orgUnitId: row.org_unit_id,
        title: row.title,
        isPrimary: row.is_primary,
      }));
    },

    async listAllMembers() {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("org_unit_members")
        .select("id, profile_id, org_unit_id, title, is_primary");

      if (error) {
        throw new Error(`listAllMembers: ${error.message}`);
      }

      return (data ?? []).map((row) => ({
        id: row.id,
        profileId: row.profile_id,
        orgUnitId: row.org_unit_id,
        title: row.title,
        isPrimary: row.is_primary,
      }));
    },

    async hasHierarchyAccess(profileId, courseId) {
      const admin = getSupabaseAdminClientOrThrow();

      // The course must live in an org unit.
      const { data: course, error: courseError } = await admin
        .from("courses")
        .select("org_unit_id")
        .eq("id", courseId)
        .single();

      if (courseError || !course?.org_unit_id) return false;

      // The user must belong to at least one org unit.
      const userUnits = await this.getUserUnits(profileId);
      const userUnitIds = userUnits.map((u) => u.orgUnitId);
      if (!userUnitIds.length) return false;

      // Access if any of the user's units is an ancestor of (or equal to) the
      // course's unit. org_unit_hierarchy_paths is a VIEW, so we query it
      // directly rather than embedding it through a foreign key.
      const { data: paths, error: pathError } = await admin
        .from("org_unit_hierarchy_paths")
        .select("ancestor_id")
        .eq("descendant_id", course.org_unit_id)
        .in("ancestor_id", userUnitIds)
        .limit(1);

      if (pathError) return false;
      return (paths ?? []).length > 0;
    },

    async createUnit(input) {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("organizational_units")
        .insert({
          name: input.name,
          type: input.type,
          parent_id: input.parentId || null,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`createUnit: ${error.message}`);
      }

      return {
        id: data.id,
        parentId: data.parent_id,
        name: data.name,
        type: data.type,
      };
    },

    async addMember(input) {
      const admin = getSupabaseAdminClientOrThrow();
      const { error } = await admin.from("org_unit_members").insert({
        profile_id: input.profileId,
        org_unit_id: input.orgUnitId,
        title: input.title,
        is_primary: input.isPrimary ?? true,
      });

      if (error) {
        throw new Error(`addMember: ${error.message}`);
      }
    },

    async removeMember(memberId) {
      const admin = getSupabaseAdminClientOrThrow();
      const { error } = await admin.from("org_unit_members").delete().eq("id", memberId);

      if (error) {
        throw new Error(`removeMember: ${error.message}`);
      }
    },
  };
}
