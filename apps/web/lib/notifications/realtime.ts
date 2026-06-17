import "server-only"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

/**
 * Signal a specific user that their notification feed has changed.
 * The client subscribes to this channel and re-polls /api/notifications/feed
 * when it fires. Payload is intentionally empty — data comes from the API.
 */
export async function broadcastNotificationEvent(userId: string): Promise<void> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return

  await fetch(`${SUPABASE_URL}/realtime/v1/api/broadcast`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({
      messages: [{ topic: `notifications:${userId}`, event: "new", payload: {} }],
    }),
  }).catch((err) => {
    console.warn("[broadcastNotificationEvent] broadcast failed:", err)
  })
}
