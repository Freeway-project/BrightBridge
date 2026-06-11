import "server-only";

import { createHmac } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { cookies } from "next/headers";

const AUTH_PROVIDER_AZURE_OIDC = "azure-oidc";
const OIDC_SESSION_COOKIE = "coursebridge_auth_session";
const OIDC_STATE_COOKIE = "coursebridge_oidc_state";
const OIDC_NONCE_COOKIE = "coursebridge_oidc_nonce";
const OIDC_NEXT_COOKIE = "coursebridge_oidc_next";

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
  jwksUri: string;
  /** Optional — when set, the id_token's `tid` claim must match. */
  allowedTenantId: string | null;
  /** Optional — used by the sign-out flow (not by token verification). */
  postLogoutRedirectUri: string | null;
};

/**
 * Auth surface used by the app. Azure OIDC is the only implementation —
 * password sign-in and magic-link minting were removed once instructors moved
 * to Entra B2B guest accounts.
 */
export interface AuthService {
  getCurrentSessionUser(): Promise<SessionUser | null>;
  signOut(): Promise<void>;
  exchangeCodeForSession(code: string, state?: string | null): Promise<void>;
}

function authProvider(): string {
  return (process.env.AUTH_PROVIDER ?? "").trim().toLowerCase();
}

export function isAzureOidcEnabled(): boolean {
  // Default to OIDC when AUTH_PROVIDER is unset — this is the only supported mode now.
  const value = authProvider();
  return value === "" || value === AUTH_PROVIDER_AZURE_OIDC;
}

export function getAzureOidcConfigOrThrow(): AzureOidcConfig {
  const clientId = process.env.AZURE_OIDC_CLIENT_ID;
  const clientSecret = process.env.AZURE_OIDC_CLIENT_SECRET;
  const tokenEndpoint = process.env.AZURE_OIDC_TOKEN_ENDPOINT;
  const issuer = process.env.AZURE_OIDC_ISSUER;
  const jwksUri = process.env.AZURE_OIDC_JWKS_URI;
  const allowedTenantId = process.env.AZURE_OIDC_ALLOWED_TENANT_ID?.trim() || null;
  const postLogoutRedirectUri = process.env.AZURE_OIDC_POST_LOGOUT_REDIRECT_URI?.trim() || null;

  if (!clientId || !clientSecret || !tokenEndpoint || !issuer || !jwksUri) {
    throw new Error("Azure OIDC configuration is incomplete (need CLIENT_ID, CLIENT_SECRET, TOKEN_ENDPOINT, ISSUER, JWKS_URI).");
  }

  return { clientId, clientSecret, tokenEndpoint, issuer, jwksUri, allowedTenantId, postLogoutRedirectUri };
}

// Cached JWKS fetcher — jose handles key rotation + 10-min cooldown internally.
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
function getJwks(jwksUri: string): ReturnType<typeof createRemoteJWKSet> {
  let jwks = jwksCache.get(jwksUri);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(jwksUri));
    jwksCache.set(jwksUri, jwks);
  }
  return jwks;
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
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  if (sig !== signSessionPayload(payloadB64)) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as OidcSessionPayload;
    if (!decoded.sub || typeof decoded.exp !== "number") return null;
    if (decoded.exp * 1000 <= Date.now()) return null;
    return decoded;
  } catch {
    return null;
  }
}

class OidcAuthService implements AuthService {
  async getCurrentSessionUser(): Promise<SessionUser | null> {
    const cookieStore = await cookies();
    const rawSession = cookieStore.get(OIDC_SESSION_COOKIE)?.value;
    if (!rawSession) return null;

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

  async signOut() {
    const cookieStore = await cookies();
    cookieStore.delete(OIDC_SESSION_COOKIE);
    cookieStore.delete(OIDC_STATE_COOKIE);
    cookieStore.delete(OIDC_NONCE_COOKIE);
    cookieStore.delete(OIDC_NEXT_COOKIE);
  }

  async exchangeCodeForSession(code: string, state?: string | null) {
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

    // Cryptographically verify the id_token against Entra's JWKS — signature,
    // audience, and issuer are checked by jose. Nonce + tenant + claim shape we
    // validate ourselves below.
    const { payload: verifiedClaims } = await jwtVerify(tokenJson.id_token, getJwks(config.jwksUri), {
      audience: config.clientId,
      issuer: config.issuer.replace(/\/$/, ""),
    });

    const claims = verifiedClaims as {
      aud?: string | string[];
      iss?: string;
      nonce?: string;
      exp?: number;
      tid?: string;
      oid?: string;
      sub?: string;
      email?: string;
      preferred_username?: string;
      name?: string;
      roles?: string[] | string;
    };

    if (expectedNonce && claims.nonce !== expectedNonce) {
      throw new Error("OIDC token nonce mismatch.");
    }

    if (config.allowedTenantId && claims.tid !== config.allowedTenantId) {
      throw new Error("OIDC token tenant not allowed.");
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
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(exp * 1000),
    });

    cookieStore.delete(OIDC_STATE_COOKIE);
    cookieStore.delete(OIDC_NONCE_COOKIE);
  }
}

export function isDevLoginEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.ENABLE_DEV_LOGIN === "1";
}

export async function mintDevSession(params: {
  sub: string;
  email: string;
  fullName: string | null;
  role: string;
}): Promise<void> {
  if (!isDevLoginEnabled()) {
    throw new Error("Dev login is disabled.");
  }

  const exp = Math.floor(Date.now() / 1000) + 8 * 60 * 60;
  const sessionValue = encodeSession({
    sub: params.sub,
    email: params.email,
    full_name: params.fullName,
    oidc_roles: [params.role],
    exp,
  });

  const cookieStore = await cookies();
  cookieStore.set(OIDC_SESSION_COOKIE, sessionValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(exp * 1000),
  });
}

let authService: AuthService | null = null;

export function getAuthService(): AuthService {
  if (!authService) {
    authService = new OidcAuthService();
  }
  return authService;
}

export { OIDC_SESSION_COOKIE, OIDC_STATE_COOKIE, OIDC_NONCE_COOKIE, OIDC_NEXT_COOKIE };
