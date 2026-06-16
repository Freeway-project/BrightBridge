import "server-only";

import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

const scryptAsync = promisify(scrypt);

const SESSION_COOKIE = "coursebridge_auth_session";

type SessionPayload = {
  sub: string;
  email: string | null;
  full_name: string | null;
  exp: number;
};

export type SessionUser = {
  id: string;
  email: string | null;
  userMetadata: Record<string, unknown>;
};

export interface AuthService {
  getCurrentSessionUser(): Promise<SessionUser | null>;
  signOut(): Promise<void>;
}

function getSessionSigningSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET is missing or too short.");
  }
  return secret;
}

function signPayload(payloadB64: string): string {
  return createHmac("sha256", getSessionSigningSecret()).update(payloadB64).digest("base64url");
}

function encodeSession(payload: SessionPayload): string {
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = signPayload(payloadB64);
  return `${payloadB64}.${sig}`;
}

function decodeSession(raw: string): SessionPayload | null {
  const parts = raw.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  if (sig !== signPayload(payloadB64)) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as SessionPayload;
    if (!decoded.sub || typeof decoded.exp !== "number") return null;
    if (decoded.exp * 1000 <= Date.now()) return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  // Bcrypt hashes from old Supabase auth (starts with $2a$ or $2b$)
  if (stored.startsWith("$2")) {
    return bcrypt.compare(password, stored);
  }
  // Scrypt format: salt_hex:hash_hex
  const [salt, storedHash] = stored.split(":");
  if (!salt || !storedHash) return false;
  try {
    const hash = (await scryptAsync(password, salt, 64)) as Buffer;
    const storedBuffer = Buffer.from(storedHash, "hex");
    return hash.length === storedBuffer.length && timingSafeEqual(hash, storedBuffer);
  } catch {
    return false;
  }
}

export async function mintSession(params: {
  sub: string;
  email: string | null;
  fullName: string | null;
}): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + 8 * 60 * 60;
  const sessionValue = encodeSession({
    sub: params.sub,
    email: params.email,
    full_name: params.fullName,
    exp,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(exp * 1000),
  });
}

class EmailPasswordAuthService implements AuthService {
  async getCurrentSessionUser(): Promise<SessionUser | null> {
    const cookieStore = await cookies();
    const rawSession = cookieStore.get(SESSION_COOKIE)?.value;
    if (!rawSession) return null;

    const session = decodeSession(rawSession);
    if (!session) {
      try {
        cookieStore.delete(SESSION_COOKIE);
      } catch {
        // read-only in Server Components — best-effort cleanup
      }
      return null;
    }

    return {
      id: session.sub,
      email: session.email,
      userMetadata: { full_name: session.full_name },
    };
  }

  async signOut() {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE);
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
  await mintSession({ sub: params.sub, email: params.email, fullName: params.fullName });
}

let authService: AuthService | null = null;

export function getAuthService(): AuthService {
  if (!authService) {
    authService = new EmailPasswordAuthService();
  }
  return authService;
}

export { SESSION_COOKIE };
