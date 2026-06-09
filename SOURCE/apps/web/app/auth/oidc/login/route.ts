import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { OIDC_NEXT_COOKIE, OIDC_NONCE_COOKIE, OIDC_STATE_COOKIE, getAzureOidcConfigOrThrow, isAzureOidcEnabled } from "@/lib/auth/service";
import { oidcLoginStartedTotal } from "@/lib/observability/metrics";

function safeNext(raw: string | null): string {
  if (!raw) return "/dashboard";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

export async function GET(request: NextRequest) {
  if (!isAzureOidcEnabled()) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  const config = getAzureOidcConfigOrThrow();
  const authorizationEndpoint = process.env.AZURE_OIDC_AUTHORIZATION_ENDPOINT;
  const redirectUri = process.env.AZURE_OIDC_REDIRECT_URI;
  const scope = process.env.AZURE_OIDC_SCOPES ?? "openid profile email";

  if (!authorizationEndpoint || !redirectUri) {
    throw new Error("AZURE_OIDC_AUTHORIZATION_ENDPOINT and AZURE_OIDC_REDIRECT_URI are required.");
  }

  const state = randomUUID();
  const nonce = randomUUID();
  const nextPath = safeNext(request.nextUrl.searchParams.get("next"));

  const authUrl = new URL(authorizationEndpoint);
  authUrl.searchParams.set("client_id", config.clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_mode", "query");
  authUrl.searchParams.set("scope", scope);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("nonce", nonce);

  const response = NextResponse.redirect(authUrl);
  const cookieOpts = {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 10 * 60,
  };
  response.cookies.set(OIDC_STATE_COOKIE, state, cookieOpts);
  response.cookies.set(OIDC_NONCE_COOKIE, nonce, cookieOpts);
  response.cookies.set(OIDC_NEXT_COOKIE, nextPath, cookieOpts);

  try {
    oidcLoginStartedTotal.inc();
  } catch {
    // Never let metrics break the login flow.
  }

  return response;
}
