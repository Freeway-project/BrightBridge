import { NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth/context"

export const runtime = "nodejs"

// Server-side proxy for the Giphy API. The key lives only on the server
// (GIPHY_API_KEY) and is never shipped to the browser. The Content Converter
// uses this to show funny/trending GIFs while a conversion is in flight.
//
// Education-facing product, so we always request rating=g.

type GiphyImage = { url?: string }
type GiphyItem = {
  id: string
  title?: string
  images?: {
    downsized?: GiphyImage
    fixed_height?: GiphyImage
    fixed_width?: GiphyImage
  }
}
type Gif = { id: string; url: string; title: string }

export async function GET(request: Request) {
  // Only logged-in users can spend our Giphy quota.
  const auth = await getAuthContext()
  if (auth.kind !== "profile") {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const apiKey = process.env.GIPHY_API_KEY
  if (!apiKey) {
    // No key configured — return an empty set so the client falls back to its
    // plain spinner rather than erroring.
    return NextResponse.json({ gifs: [] })
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim()
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 30, 1), 50)

  // With a search term ("funny") use search; otherwise fall back to trending.
  const base = "https://api.giphy.com/v1/gifs"
  const url = q
    ? `${base}/search?api_key=${apiKey}&q=${encodeURIComponent(q)}&limit=${limit}&rating=g&bundle=messaging_non_clips`
    : `${base}/trending?api_key=${apiKey}&limit=${limit}&rating=g&bundle=messaging_non_clips`

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)

    if (!res.ok) {
      return NextResponse.json({ gifs: [] })
    }

    const json = (await res.json()) as { data?: GiphyItem[] }
    const gifs: Gif[] = (json.data || [])
      .map((it): Gif | null => {
        const img =
          it.images?.downsized?.url ||
          it.images?.fixed_height?.url ||
          it.images?.fixed_width?.url
        return img ? { id: it.id, url: img, title: it.title || "" } : null
      })
      .filter((g): g is Gif => g !== null)

    return NextResponse.json({ gifs })
  } catch {
    // Network error / timeout — let the client fall back gracefully.
    return NextResponse.json({ gifs: [] })
  }
}
