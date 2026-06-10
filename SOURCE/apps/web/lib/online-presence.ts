'use client'

// Polling-based online presence. Replaces Supabase Realtime Presence so it works
// against self-hosted Postgres (where there is no Supabase Realtime). The client
// sends periodic heartbeats to /api/presence/heartbeat (the server derives the
// user from the session) and polls /api/presence/online for the live roster.
// The public API (trackOnlinePresence / subscribeToOnlineUsers) is unchanged so
// callers don't need to change.

export type OnlineUser = {
  userId: string
  name: string | null
  email: string
  role: string
  online_at: string
}

type Listener = (users: OnlineUser[]) => void

const HEARTBEAT_INTERVAL_MS = 30_000
const POLL_INTERVAL_MS = 15_000

let latestUsers: OnlineUser[] = []
const listeners = new Set<Listener>()
let pollTimer: ReturnType<typeof setInterval> | null = null

function emitUsers() {
  for (const listener of listeners) {
    listener(latestUsers)
  }
}

async function fetchOnlineUsers() {
  try {
    const res = await fetch('/api/presence/online', { cache: 'no-store' })
    if (!res.ok) return
    const data = (await res.json()) as { users?: OnlineUser[] }
    latestUsers = data.users ?? []
    emitUsers()
  } catch {
    // Transient network error — keep the last known roster.
  }
}

function startPolling() {
  if (pollTimer) return
  void fetchOnlineUsers()
  pollTimer = setInterval(() => {
    void fetchOnlineUsers()
  }, POLL_INTERVAL_MS)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

export function trackOnlinePresence(_user: Omit<OnlineUser, 'online_at'>) {
  const sendHeartbeat = () => {
    void fetch('/api/presence/heartbeat', { method: 'POST', cache: 'no-store' }).catch(() => {})
  }

  sendHeartbeat()
  const heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS)

  return () => {
    clearInterval(heartbeatTimer)
    void fetch('/api/presence/heartbeat', { method: 'DELETE', cache: 'no-store' }).catch(() => {})
  }
}

export function subscribeToOnlineUsers(listener: Listener) {
  listeners.add(listener)
  listener(latestUsers)
  startPolling()

  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      stopPolling()
    }
  }
}
