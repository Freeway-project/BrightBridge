import "server-only"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

export async function broadcastChatEvent(
  conversationId: string,
  event: string,
  payload: unknown,
): Promise<void> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return

  await fetch(`${SUPABASE_URL}/realtime/v1/api/broadcast`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({
      messages: [{ topic: `chat:${conversationId}`, event, payload }],
    }),
  }).catch((err) => {
    console.warn("[broadcastChatEvent] broadcast failed:", err)
  })
}
