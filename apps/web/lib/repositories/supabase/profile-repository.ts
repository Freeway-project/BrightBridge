import "server-only";

import type { Role } from "@coursebridge/workflow";
import type { ProfileRepository } from "@/lib/repositories/contracts";
import { getSupabaseAdminClientOrThrow } from "./shared";

export function createSupabaseProfileRepository(): ProfileRepository {
  return {
    async getProfileById(profileId) {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("profiles")
        .select("id,email,full_name,role")
        .eq("id", profileId)
        .maybeSingle();

      if (error) {
        throw new Error(`Could not load profile: ${error.message}`);
      }

      if (!data) {
        return null;
      }

      return {
        id: data.id,
        email: data.email,
        fullName: data.full_name,
        role: data.role as Role,
      };
    },

    async getProfilesByRole(role) {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("profiles")
        .select("id, email, full_name, role")
        .eq("role", role)
        .order("full_name", { ascending: true, nullsFirst: false });

      if (error) {
        throw new Error(`getProfilesByRole: ${error.message}`);
      }

      return (data ?? []).map((profile) => ({
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        role: profile.role as Role,
      }));
    },

    async listUsers(page = 1, pageSize = 20, search = "") {
      const admin = getSupabaseAdminClientOrThrow();
      
      let query = admin
        .from("profiles")
        .select("id, email, full_name, role, created_at", { count: "exact" });

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,role.ilike.%${search}%`);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        throw new Error(`profiles: ${error.message}`);
      }

      const rows = (data ?? []).map((profile) => ({
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        role: profile.role as Role,
        createdAt: profile.created_at,
      }));

      const total = count ?? 0;
      return {
        data: rows,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    },

    async upsertProfile(input) {
      const admin = getSupabaseAdminClientOrThrow();
      const { error } = await admin.from("profiles").upsert(
        {
          id: input.id,
          email: input.email,
          full_name: input.fullName,
          role: input.role,
        },
        { onConflict: "id" },
      );

      if (error) {
        throw new Error(`Could not upsert profile: ${error.message}`);
      }
    },

    async updateProfileRole(profileId, role) {
      const admin = getSupabaseAdminClientOrThrow();
      const { error } = await admin.from("profiles").update({ role }).eq("id", profileId);

      if (error) {
        throw new Error(`Could not update profile role: ${error.message}`);
      }
    },
  };
}
