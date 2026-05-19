'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  userId: string
  name: string | null
  email: string
  role: string
}

// Joins the global presence channel so the user shows as "online".
// Renders nothing — side-effect only.
export function OnlinePresenceTracker({ userId, name, email, role }: Props) {
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current

    const channel = supabase.channel('online_users', {
      config: { presence: { key: userId } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {})
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ userId, name, email, role, online_at: new Date().toISOString() })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, name, email, role])

  return null
}
