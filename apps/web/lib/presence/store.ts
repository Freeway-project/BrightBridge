import "server-only";

export type PresenceUser = {
  userId: string;
  name: string | null;
  email: string;
  role: string;
  online_at: string;
};

type PresenceEntry = PresenceUser & {
  expiresAt: number;
};

const PRESENCE_TTL_MS = 90_000;
const entries = new Map<string, PresenceEntry>();

function pruneExpired(now = Date.now()) {
  for (const [userId, entry] of entries.entries()) {
    if (entry.expiresAt <= now) {
      entries.delete(userId);
    }
  }
}

export function heartbeatUser(input: Omit<PresenceUser, "online_at">) {
  const now = Date.now();
  const online_at = new Date(now).toISOString();
  entries.set(input.userId, {
    ...input,
    online_at,
    expiresAt: now + PRESENCE_TTL_MS,
  });
  pruneExpired(now);
}

export function removeUserPresence(userId: string) {
  entries.delete(userId);
}

export function listOnlineUsers(): PresenceUser[] {
  pruneExpired();
  return Array.from(entries.values())
    .sort((a, b) => b.online_at.localeCompare(a.online_at))
    .map(({ expiresAt: _expiresAt, ...user }) => user);
}
