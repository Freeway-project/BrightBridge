'use client'

import posthog from 'posthog-js'
import { useEffect } from 'react'

type Props = {
  userId: string
  email: string
  name: string | null
  role: string
}

export function PostHogIdentifier({ userId, email, name, role }: Props) {
  useEffect(() => {
    posthog.identify(userId, { email, name: name ?? undefined, role })
  }, [userId])
  return null
}
