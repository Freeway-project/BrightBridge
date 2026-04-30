import "server-only";

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
        role: data.role,
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
        role: profile.role,
      }));
    },

    async listUsers() {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("profiles")
        .select("id, email, full_name, role, created_at")
        .order("role", { ascending: true });

      if (error) {
        throw new Error(`profiles: ${error.message}`);
      }

      return (data ?? []).map((profile) => ({
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        role: profile.role,
        createdAt: profile.created_at,
      }));
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
