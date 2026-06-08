'use client'

export type OnlineUser = {
  userId: string
  name: string | null
  email: string
  role: string
  online_at: string
}

type Listener = (users: OnlineUser[]) => void
let latestUsers: OnlineUser[] = []
const listeners = new Set<Listener>()
let presencePollTimer: number | null = null

function emitUsers() {
  for (const listener of listeners) {
    listener(latestUsers)
  }
}

async function pollOnlineUsers() {
  try {
    const response = await fetch('/api/presence/online', {
      credentials: 'include',
      cache: 'no-store',
    })
    if (!response.ok) return

    const payload = (await response.json()) as { users?: OnlineUser[] }
    latestUsers = payload.users ?? []
    emitUsers()
  } catch {
    // Best-effort polling only.
  }
}

function ensurePresencePolling() {
  if (presencePollTimer !== null) {
    return
  }

  void pollOnlineUsers()
  presencePollTimer = window.setInterval(() => {
    void pollOnlineUsers()
  }, 15000)
}

export function trackOnlinePresence(user: Omit<OnlineUser, 'online_at'>) {
  let heartbeatTimer: number | null = null
  let disposed = false

  const sendHeartbeat = async () => {
    if (disposed) return
    try {
      await fetch('/api/presence/heartbeat', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
      })
    } catch {
      // Best-effort heartbeat.
    }
  }

  void sendHeartbeat()
  heartbeatTimer = window.setInterval(() => {
    void sendHeartbeat()
  }, 30000)

  return () => {
    disposed = true
    if (heartbeatTimer !== null) {
      window.clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }

    void fetch('/api/presence/heartbeat', {
      method: 'DELETE',
      credentials: 'include',
      cache: 'no-store',
      keepalive: true,
    })
  }
}

export function subscribeToOnlineUsers(listener: Listener) {
  listeners.add(listener)
  listener(latestUsers)
  ensurePresencePolling()

  return () => {
    listeners.delete(listener)

    if (listeners.size === 0 && presencePollTimer !== null) {
      window.clearInterval(presencePollTimer)
      presencePollTimer = null
    }
  }
}
