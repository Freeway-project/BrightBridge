"use client"

import { useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"

/**
 * Subscribes to Supabase Realtime broadcast events for a course's comments.
 * Calls `onInsert` immediately when a new comment is broadcast from a server action.
 * Cleans up the channel on unmount or courseId change.
 */
export function useCourseCommentRealtime(courseId: string, onInsert: () => void) {
  const onInsertRef = useRef(onInsert)
  useEffect(() => { onInsertRef.current = onInsert })

  useEffect(() => {
    const supabase = createClient()
    if (!supabase) return

    const channel = supabase
      .channel(`course-comments-${courseId}`)
      .on("broadcast", { event: "new_comment" }, () => {
        onInsertRef.current()
      })
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [courseId])
}
