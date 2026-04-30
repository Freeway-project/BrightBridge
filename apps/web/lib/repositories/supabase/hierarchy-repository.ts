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

      // Check if user is a member of an org unit that is an ancestor of the course's org unit
      // This uses the flattened org_unit_hierarchy_paths view
      const { data, error } = await admin.rpc("check_hierarchy_access", {
        p_profile_id: profileId,
        p_course_id: courseId,
      });

      if (error) {
        // Fallback to manual check if RPC is not yet created
        const { data: access, error: accessError } = await admin
          .from("courses")
          .select(`
            org_unit_id,
            organizational_units!courses_org_unit_id_fkey (
              org_unit_hierarchy_paths!org_unit_hierarchy_paths_descendant_id_fkey (
                ancestor_id
              )
            )
          `)
          .eq("id", courseId)
          .single();

        if (accessError || !access.org_unit_id) return false;

        const userUnits = await this.getUserUnits(profileId);
        const userUnitIds = userUnits.map((u) => u.orgUnitId);

        // Check if any of user's unit IDs are ancestors of course's unit
        const ancestors = (access.organizational_units as any)?.org_unit_hierarchy_paths ?? [];
        return ancestors.some((p: any) => userUnitIds.includes(p.ancestor_id));
      }

      return Boolean(data);
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
