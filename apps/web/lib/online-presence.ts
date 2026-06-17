'use client'

import { createClient } from '@/lib/supabase/client'

export type OnlineUser = {
  userId: string
  name: string | null
  email: string
  role: string
  online_at: string
}

type PresencePayload = OnlineUser & { presence_ref: string }
type Listener = (users: OnlineUser[]) => void

let presenceChannel: ReturnType<NonNullable<ReturnType<typeof createClient>>['channel']> | null = null
let latestUsers: OnlineUser[] = []
const listeners = new Set<Listener>()

function emitUsers() {
  for (const l of listeners) l(latestUsers)
}

function ensureChannel() {
  if (presenceChannel) return presenceChannel
  const supabase = createClient()
  if (!supabase) return null

  presenceChannel = supabase.channel('online-users')
  presenceChannel.on('presence', { event: 'sync' }, () => {
    if (!presenceChannel) return
    const raw = presenceChannel.presenceState<OnlineUser>()
    latestUsers = (Object.values(raw).flat() as PresencePayload[]).map(
      ({ presence_ref: _ref, ...user }) => user,
    )
    emitUsers()
  })
  presenceChannel.subscribe()
  return presenceChannel
}

export function trackOnlinePresence(user: Omit<OnlineUser, 'online_at'>) {
  const ch = ensureChannel()
  if (!ch) return () => {}

  const payload: OnlineUser = { ...user, online_at: new Date().toISOString() }
  void ch.track(payload)

  return () => {
    void ch.untrack()
  }
}

export function subscribeToOnlineUsers(listener: Listener) {
  listeners.add(listener)
  listener(latestUsers)
  ensureChannel()

  return () => {
    listeners.delete(listener)
  }
}
