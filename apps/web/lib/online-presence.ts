'use client'

import { createClient } from '@/lib/supabase/client'

export type OnlineUser = {
  userId: string
  name: string | null
  email: string
  role: string
  online_at: string
}

type Listener = (users: OnlineUser[]) => void
type SupabaseClient = ReturnType<typeof createClient>
type PresenceChannel = ReturnType<SupabaseClient['channel']>

let supabase: SupabaseClient | null = null
let channel: PresenceChannel | null = null
let channelUserId: string | null = null
let trackedUser: Omit<OnlineUser, 'online_at'> | null = null
let isSubscribed = false
let latestUsers: OnlineUser[] = []
const listeners = new Set<Listener>()

function emitUsers() {
  for (const listener of listeners) {
    listener(latestUsers)
  }
}

function ensureChannel(userId?: string) {
  if (channel && (!userId || channelUserId === userId)) {
    return channel
  }

  if (!supabase) {
    supabase = createClient()
  }

  if (channel) {
    supabase.removeChannel(channel)
    channel = null
    isSubscribed = false
    latestUsers = []
    emitUsers()
  }

  channelUserId = userId ?? null
  channel = supabase.channel('online_users', {
    config: userId ? { presence: { key: userId } } : {},
  })

  channel
    .on('presence', { event: 'sync' }, () => {
      if (!channel) return

      const state = channel.presenceState<OnlineUser>()
      latestUsers = Object.values(state).flatMap((presences) => presences)
      emitUsers()
    })
    .subscribe(async (status) => {
      isSubscribed = status === 'SUBSCRIBED'

      if (isSubscribed && trackedUser) {
        await channel?.track({ ...trackedUser, online_at: new Date().toISOString() })
      }
    })

  return channel
}

export function trackOnlinePresence(user: Omit<OnlineUser, 'online_at'>) {
  trackedUser = user
  const activeChannel = ensureChannel(user.userId)

  if (isSubscribed) {
    void activeChannel.track({ ...user, online_at: new Date().toISOString() })
  }

  return () => {
    if (trackedUser?.userId === user.userId) {
      trackedUser = null
    }
    void activeChannel.untrack()
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
