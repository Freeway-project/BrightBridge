import "server-only";

import { createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getProfileRepository } from "@/lib/repositories";

const AUTH_PROVIDER_AZURE_OIDC = "azure-oidc";
const AUTH_PROVIDER_DEV = "dev";
const OIDC_SESSION_COOKIE = "coursebridge_auth_session";
const OIDC_STATE_COOKIE = "coursebridge_oidc_state";
const OIDC_NONCE_COOKIE = "coursebridge_oidc_nonce";

type OidcSessionPayload = {
  sub: string;
  email: string | null;
  full_name: string | null;
  oidc_roles?: string[];
  exp: number;
};

export type SessionUser = {
  id: string;
  email: string | null;
  userMetadata: Record<string, unknown>;
};

export type AzureOidcConfig = {
  clientId: string;
  clientSecret: string;
  tokenEndpoint: string;
  issuer: string;
};

export interface AuthService {
  getCurrentSessionUser(): Promise<SessionUser | null>;
  signInWithPassword(email: string, password: string): Promise<{ error: string | null }>;
  signOut(): Promise<void>;
  exchangeCodeForSession(code: string, state?: string | null): Promise<void>;
  createUserWithPassword(input: {
    email: string;
    password: string;
    emailConfirm?: boolean;
    userMetadata?: Record<string, unknown>;
  }): Promise<{ id: string; email: string | null }>;
  updateUserMetadata(userId: string, userMetadata: Record<string, unknown>): Promise<void>;
  /**
   * Generates a Supabase magic-link token for an existing user without sending
   * Supabase's own email — we deliver the link ourselves. Returns the hashed
   * token to be verified via verifyMagicLink.
   */
  generateMagicLinkHashedToken(email: string): Promise<string>;
  /** Verifies a magic-link token and establishes the session cookie. */
  verifyMagicLink(tokenHash: string): Promise<{ error: string | null }>;
  getBrowserClient(): ReturnType<typeof createBrowserClient>;
}

function authProvider(): string {
  return (process.env.AUTH_PROVIDER ?? "").trim().toLowerCase();
}

export function isAzureOidcEnabled(): boolean {
  return authProvider() === AUTH_PROVIDER_AZURE_OIDC;
}

export function isDevAuthEnabled(): boolean {
  return authProvider() === AUTH_PROVIDER_DEV;
}

export function getAzureOidcConfigOrThrow(): AzureOidcConfig {
  const clientId = process.env.AZURE_OIDC_CLIENT_ID;
  const clientSecret = process.env.AZURE_OIDC_CLIENT_SECRET;
  const tokenEndpoint = process.env.AZURE_OIDC_TOKEN_ENDPOINT;
  const issuer = process.env.AZURE_OIDC_ISSUER;

  if (!clientId || !clientSecret || !tokenEndpoint || !issuer) {
    throw new Error("Azure OIDC configuration is incomplete.");
  }

  return { clientId, clientSecret, tokenEndpoint, issuer };
}

function getSessionSigningSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET is missing or too short for OIDC sessions.");
  }
  return secret;
}

function signSessionPayload(payloadB64: string): string {
  return createHmac("sha256", getSessionSigningSecret()).update(payloadB64).digest("base64url");
}

function encodeSession(payload: OidcSessionPayload): string {
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = signSessionPayload(payloadB64);
  return `${payloadB64}.${sig}`;
}

function decodeSession(raw: string): OidcSessionPayload | null {
  const parts = raw.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [payloadB64, sig] = parts;
  if (sig !== signSessionPayload(payloadB64)) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as OidcSessionPayload;

    if (!decoded.sub || typeof decoded.exp !== "number") {
      return null;
    }

    if (decoded.exp * 1000 <= Date.now()) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

function decodeJwtPayload<T>(jwt: string): T {
  const parts = jwt.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid id_token format.");
  }

  const raw = Buffer.from(parts[1], "base64url").toString("utf8");
  return JSON.parse(raw) as T;
}

// ── Shared Supabase-admin operations ────────────────────────────────────────
// User management and magic-link invites still flow through Supabase/GoTrue
// during the transition; both auth services delegate to these helpers.

async function supabaseCreateUserWithPassword(input: {
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

  return { id: data.user.id, email: data.user.email ?? null };
}

async function supabaseUpdateUserMetadata(userId: string, userMetadata: Record<string, unknown>) {
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

async function supabaseGenerateMagicLinkHashedToken(email: string) {
  const admin = createAdminClient();
  if (!admin) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
  }

  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });

  if (error) {
    throw new Error(error.message);
  }

  const hashedToken = data.properties?.hashed_token;
  if (!hashedToken) {
    throw new Error("Supabase did not return a magic-link token.");
  }

  return hashedToken;
}

async function supabaseVerifyMagicLink(tokenHash: string) {
  const supabase = await createServerClient();
  const { error } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
  return { error: error?.message ?? null };
}

// ── Supabase Auth (default) ─────────────────────────────────────────────────

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

  async exchangeCodeForSession(code: string, _state?: string | null) {
    const supabase = await createServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  async createUserWithPassword(input: {
    email: string;
    password: string;
    emailConfirm?: boolean;
    userMetadata?: Record<string, unknown>;
  }) {
    return supabaseCreateUserWithPassword(input);
  }

  async updateUserMetadata(userId: string, userMetadata: Record<string, unknown>) {
    return supabaseUpdateUserMetadata(userId, userMetadata);
  }

  async generateMagicLinkHashedToken(email: string) {
    return supabaseGenerateMagicLinkHashedToken(email);
  }

  async verifyMagicLink(tokenHash: string) {
    return supabaseVerifyMagicLink(tokenHash);
  }

  getBrowserClient() {
    return createBrowserClient();
  }
}

// ── Azure OIDC / Entra (AUTH_PROVIDER=azure-oidc) ───────────────────────────

class OidcAuthService implements AuthService {
  async getCurrentSessionUser(): Promise<SessionUser | null> {
    const cookieStore = await cookies();
    const rawSession = cookieStore.get(OIDC_SESSION_COOKIE)?.value;
    if (!rawSession) {
      return null;
    }

    const session = decodeSession(rawSession);
    if (!session) {
      try {
        cookieStore.delete(OIDC_SESSION_COOKIE);
      } catch {
        // cookies() is read-only in Server Components — best-effort cleanup.
      }
      return null;
    }

    return {
      id: session.sub,
      email: session.email,
      userMetadata: {
        full_name: session.full_name,
        oidc_roles: session.oidc_roles ?? [],
      },
    };
  }

  async signInWithPassword(_email: string, _password: string) {
    return { error: "Password login is disabled. Use Azure OIDC sign-in." };
  }

  async signOut() {
    const cookieStore = await cookies();
    cookieStore.delete(OIDC_SESSION_COOKIE);
    cookieStore.delete(OIDC_STATE_COOKIE);
    cookieStore.delete(OIDC_NONCE_COOKIE);
  }

  async exchangeCodeForSession(code: string, state?: string | null) {
    if (!isAzureOidcEnabled()) {
      throw new Error("Only Azure OIDC authentication is supported.");
    }

    const config = getAzureOidcConfigOrThrow();
    const redirectUri = process.env.AZURE_OIDC_REDIRECT_URI;
    if (!redirectUri) {
      throw new Error("AZURE_OIDC_REDIRECT_URI is required.");
    }

    const cookieStore = await cookies();
    const expectedState = cookieStore.get(OIDC_STATE_COOKIE)?.value;
    const expectedNonce = cookieStore.get(OIDC_NONCE_COOKIE)?.value;

    if (!state || !expectedState || state !== expectedState) {
      throw new Error("Invalid OIDC state.");
    }

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: redirectUri,
    });

    const tokenResponse = await fetch(config.tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });

    if (!tokenResponse.ok) {
      throw new Error(`OIDC token exchange failed (${tokenResponse.status}).`);
    }

    const tokenJson = (await tokenResponse.json()) as { id_token?: string };

    if (!tokenJson.id_token) {
      throw new Error("OIDC token response missing id_token.");
    }

    const claims = decodeJwtPayload<{
      aud?: string | string[];
      iss?: string;
      nonce?: string;
      exp?: number;
      oid?: string;
      sub?: string;
      email?: string;
      preferred_username?: string;
      name?: string;
      roles?: string[] | string;
    }>(tokenJson.id_token);

    const audience = claims.aud;
    const isAudienceValid = Array.isArray(audience)
      ? audience.includes(config.clientId)
      : audience === config.clientId;

    if (!isAudienceValid) {
      throw new Error("OIDC token audience mismatch.");
    }

    if (!claims.iss || !claims.iss.startsWith(config.issuer.replace(/\/$/, ""))) {
      throw new Error("OIDC token issuer mismatch.");
    }

    if (expectedNonce && claims.nonce !== expectedNonce) {
      throw new Error("OIDC token nonce mismatch.");
    }

    const exp = typeof claims.exp === "number" ? claims.exp : Math.floor(Date.now() / 1000) + 8 * 60 * 60;
    const sub = claims.oid ?? claims.sub;
    const oidcRoles = Array.isArray(claims.roles)
      ? claims.roles.filter((role): role is string => typeof role === "string")
      : typeof claims.roles === "string"
        ? [claims.roles]
        : [];

    if (!sub) {
      throw new Error("OIDC token missing subject.");
    }

    const sessionValue = encodeSession({
      sub,
      email: claims.email ?? claims.preferred_username ?? null,
      full_name: claims.name ?? null,
      oidc_roles: oidcRoles,
      exp,
    });

    cookieStore.set(OIDC_SESSION_COOKIE, sessionValue, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      expires: new Date(exp * 1000),
    });

    cookieStore.delete(OIDC_STATE_COOKIE);
    cookieStore.delete(OIDC_NONCE_COOKIE);
  }

  // User management + magic-link invites still flow through Supabase/GoTrue
  // during the transition (Entra users are auto-provisioned on first login).
  async createUserWithPassword(input: {
    email: string;
    password: string;
    emailConfirm?: boolean;
    userMetadata?: Record<string, unknown>;
  }) {
    return supabaseCreateUserWithPassword(input);
  }

  async updateUserMetadata(userId: string, userMetadata: Record<string, unknown>) {
    return supabaseUpdateUserMetadata(userId, userMetadata);
  }

  async generateMagicLinkHashedToken(email: string) {
    return supabaseGenerateMagicLinkHashedToken(email);
  }

  async verifyMagicLink(tokenHash: string) {
    return supabaseVerifyMagicLink(tokenHash);
  }

  getBrowserClient() {
    return createBrowserClient();
  }
}

// ── Local dev (AUTH_PROVIDER=dev) ───────────────────────────────────────────
// Fully offline auth for `npm run dev` against a local Postgres — no Supabase or
// Entra needed. Reuses the OIDC signed-cookie session, but "signs in" by looking
// up a seeded profile by email (the login page's dev quick-login). Disabled when
// NODE_ENV=production.

class DevAuthService implements AuthService {
  async getCurrentSessionUser(): Promise<SessionUser | null> {
    const cookieStore = await cookies();
    const rawSession = cookieStore.get(OIDC_SESSION_COOKIE)?.value;
    if (!rawSession) {
      return null;
    }

    const session = decodeSession(rawSession);
    if (!session) {
      try {
        cookieStore.delete(OIDC_SESSION_COOKIE);
      } catch {
        // cookies() is read-only in Server Components — best-effort cleanup.
      }
      return null;
    }

    return {
      id: session.sub,
      email: session.email,
      userMetadata: { full_name: session.full_name },
    };
  }

  async signInWithPassword(email: string, _password: string) {
    if (process.env.NODE_ENV === "production") {
      return { error: "Dev sign-in is disabled in production." };
    }

    const profile = await getProfileRepository().getProfileByEmail(email.trim().toLowerCase());
    if (!profile) {
      return { error: `No local profile for ${email}. Seed the dev database: npm run dev:db:seed` };
    }

    const exp = Math.floor(Date.now() / 1000) + 8 * 60 * 60;
    const cookieStore = await cookies();
    cookieStore.set(
      OIDC_SESSION_COOKIE,
      encodeSession({ sub: profile.id, email: profile.email, full_name: profile.fullName, exp }),
      { httpOnly: true, secure: false, sameSite: "lax", path: "/", expires: new Date(exp * 1000) },
    );
    return { error: null };
  }

  async signOut() {
    const cookieStore = await cookies();
    cookieStore.delete(OIDC_SESSION_COOKIE);
  }

  async exchangeCodeForSession(_code: string, _state?: string | null) {
    // Dev auth uses direct sign-in, not an authorization-code exchange.
  }

  async createUserWithPassword(input: {
    email: string;
    password: string;
    emailConfirm?: boolean;
    userMetadata?: Record<string, unknown>;
  }) {
    return supabaseCreateUserWithPassword(input);
  }

  async updateUserMetadata(userId: string, userMetadata: Record<string, unknown>) {
    return supabaseUpdateUserMetadata(userId, userMetadata);
  }

  async generateMagicLinkHashedToken(email: string) {
    return supabaseGenerateMagicLinkHashedToken(email);
  }

  async verifyMagicLink(tokenHash: string) {
    return supabaseVerifyMagicLink(tokenHash);
  }

  getBrowserClient() {
    return createBrowserClient();
  }
}

let authService: AuthService | null = null;

export function getAuthService(): AuthService {
  if (authService) {
    return authService;
  }

  if (isAzureOidcEnabled()) {
    authService = new OidcAuthService();
  } else if (isDevAuthEnabled()) {
    authService = new DevAuthService();
  } else {
    authService = new SupabaseAuthService();
  }

  return authService;
}

export { OIDC_SESSION_COOKIE, OIDC_STATE_COOKIE, OIDC_NONCE_COOKIE };
