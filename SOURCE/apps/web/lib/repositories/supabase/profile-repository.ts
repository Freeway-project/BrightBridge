import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";
import type { Role } from "@coursebridge/workflow";
import type { ProfileRepository } from "@/lib/repositories/contracts";
import { getSupabaseAdminClientOrThrow } from "./shared";

function formatPostgrestError(prefix: string, error: PostgrestError): string {
  const bits = [error.message];
  if (error.code) bits.push(`code=${error.code}`);
  if (error.details) bits.push(`details=${error.details}`);
  if (error.hint) bits.push(`hint=${error.hint}`);
  return `${prefix}: ${bits.join(" | ")}`;
}

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
        throw new Error(formatPostgrestError("Could not load profile", error));
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

    async getProfileByEmail(email) {
      const admin = getSupabaseAdminClientOrThrow();
      const { data, error } = await admin
        .from("profiles")
        .select("id,email,full_name,role")
        .ilike("email", email.trim())
        .maybeSingle();

      if (error) {
        throw new Error(formatPostgrestError("Could not load profile by email", error));
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
        throw new Error(formatPostgrestError("getProfilesByRole", error));
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
        // PGRST103: requested range is past the last row (e.g. ?page=99 on a
        // shrinking table). Return an empty page with the real total instead of
        // throwing, so the page renders and pagination can clamp itself.
        if (error.code === "PGRST103") {
          let countQuery = admin
            .from("profiles")
            .select("id", { count: "exact", head: true });
          if (search) {
            countQuery = countQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,role.ilike.%${search}%`);
          }
          const { count: total } = await countQuery;
          const safeTotal = total ?? 0;
          return {
            data: [],
            total: safeTotal,
            page,
            pageSize,
            totalPages: Math.ceil(safeTotal / pageSize),
          };
        }
        throw new Error(formatPostgrestError("profiles list", error));
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
        throw new Error(formatPostgrestError("Could not upsert profile", error));
      }
    },

    async updateProfileRole(profileId, role) {
      const admin = getSupabaseAdminClientOrThrow();
      const { error } = await admin.from("profiles").update({ role }).eq("id", profileId);

      if (error) {
        throw new Error(formatPostgrestError("Could not update profile role", error));
      }
    },
  };
}
