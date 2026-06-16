import "server-only"

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js"

let adminClient: SupabaseClient | null | undefined

export function createAdminClient(): SupabaseClient | null {
  if (adminClient !== undefined) return adminClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE?.trim()

  if (!url || !serviceRoleKey) {
    adminClient = null
    return adminClient
  }

  adminClient = createSupabaseClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return adminClient
}
