'use client'

import { useEffect } from 'react'
import { trackOnlinePresence } from '@/lib/online-presence'

type Props = {
  userId: string
  name: string | null
  email: string
  role: string
}

// Joins the global presence channel so the user shows as "online".
// Renders nothing — side-effect only.
export function OnlinePresenceTracker({ userId, name, email, role }: Props) {
  useEffect(() => {
    return trackOnlinePresence({ userId, name, email, role })
  }, [userId, name, email, role])

  return null
}
