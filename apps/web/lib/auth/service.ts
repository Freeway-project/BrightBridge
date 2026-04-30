import "server-only";

import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";

export type SessionUser = {
  id: string;
  email: string | null;
  userMetadata: Record<string, unknown>;
};

export interface AuthService {
  getCurrentSessionUser(): Promise<SessionUser | null>;
  signInWithPassword(email: string, password: string): Promise<{ error: string | null }>;
  signOut(): Promise<void>;
  exchangeCodeForSession(code: string): Promise<void>;
  createUserWithPassword(input: {
    email: string;
    password: string;
    emailConfirm?: boolean;
    userMetadata?: Record<string, unknown>;
  }): Promise<{ id: string; email: string | null }>;
  updateUserMetadata(userId: string, userMetadata: Record<string, unknown>): Promise<void>;
  getBrowserClient(): ReturnType<typeof createBrowserClient>;
}

class SupabaseAuthService implements AuthService {
  async getCurrentSessionUser(): Promise<SessionUser | null> {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email ?? null,
      userMetadata: user.user_metadata,
    };
  }

  async signInWithPassword(email: string, password: string) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async signOut() {
    const supabase = await createServerClient();
    await supabase.auth.signOut();
  }

  async exchangeCodeForSession(code: string) {
    const supabase = await createServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  async createUserWithPassword(input: {
    email: string;
    password: string;
    emailConfirm?: boolean;
    userMetadata?: Record<string, unknown>;
  }) {
    const admin = createAdminClient();

    if (!admin) {
      throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
    }

    const { data, error } = await admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: input.emailConfirm ?? true,
      user_metadata: input.userMetadata ?? {},
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error("Supabase did not return the created user.");
    }

    return {
      id: data.user.id,
      email: data.user.email ?? null,
    };
  }

  async updateUserMetadata(userId: string, userMetadata: Record<string, unknown>) {
    const admin = createAdminClient();

    if (!admin) {
      throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
    }

    const { error } = await admin.auth.admin.updateUserById(userId, {
      user_metadata: userMetadata,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  getBrowserClient() {
    return createBrowserClient();
  }
}

let authService: AuthService | null = null;

export function getAuthService(): AuthService {
  authService ??= new SupabaseAuthService();
  return authService;
}
