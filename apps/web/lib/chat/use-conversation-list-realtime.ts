"use client"

import { useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"

/**
 * Keeps a TA's conversation list live by subscribing to two Supabase Realtime
 * broadcast channels:
 *
 *  - notifications:{userId}   fires when any member sends a message to the user
 *  - chat:{activeId}          fires on every event in the open conversation,
 *                             which covers the user's own sent messages (no
 *                             notification broadcast fires for the sender)
 *
 * Calls `onUpdate` on either signal so the caller can re-fetch the list.
 */
export function useConversationListRealtime(
  userId: string,
  activeConversationId: string | null,
  onUpdate: () => void,
) {
  const onUpdateRef = useRef(onUpdate)
  useEffect(() => { onUpdateRef.current = onUpdate })

  // Subscribe to the user's notification channel (incoming messages from others)
  useEffect(() => {
    const supabase = createClient()
    if (!supabase) return

    const channel = supabase
      .channel(`conv-list-notify:${userId}`)
      .on("broadcast", { event: "new" }, () => {
        onUpdateRef.current()
      })
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [userId])

  // Subscribe to the active conversation (catches the user's own sent messages)
  useEffect(() => {
    if (!activeConversationId) return
    const supabase = createClient()
    if (!supabase) return

    const channel = supabase
      .channel(`conv-list-active:${activeConversationId}`)
      .on("broadcast", { event: "message" }, () => {
        onUpdateRef.current()
      })
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [activeConversationId])
}
