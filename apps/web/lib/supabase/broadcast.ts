import "server-only"

/**
 * Sends a Supabase Realtime broadcast message via REST — no WebSocket needed.
 * Used to signal connected browser clients after a server action mutates data.
 * Non-fatal: errors are swallowed so callers degrade to fallback polling.
 */
export async function broadcastCourseCommentEvent(courseId: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE?.trim()
  )
  if (!url || !key) return

  try {
    await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        messages: [
          {
            topic: `realtime:course-comments-${courseId}`,
            event: "broadcast",
            payload: {
              type: "broadcast",
              event: "new_comment",
              payload: { courseId },
            },
          },
        ],
      }),
    })
  } catch {
    // Non-fatal: browser falls back to 60s polling
  }
}
