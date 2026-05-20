interface Meme {
  title: string
  url: string
}

const RAPIDAPI_KEY = process.env.NEXT_PUBLIC_RAPIDAPI_KEY
const RAPIDAPI_HOST = "reddit-meme.p.rapidapi.com"

async function fetchMemes(limit: number): Promise<Meme[]> {
  if (!RAPIDAPI_KEY) {
    console.warn("RAPIDAPI_KEY not configured")
    return []
  }

  try {
    const response = await fetch(`https://${RAPIDAPI_HOST}/memes/trending?limit=${limit}`, {
      headers: {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": RAPIDAPI_HOST,
      },
    })

    if (!response.ok) {
      console.error("Meme API error:", response.statusText)
      return []
    }

    const data = await response.json()

    if (Array.isArray(data)) {
      return data.map(m => ({
        title: m.title || "Funny Meme",
        url: m.url,
      }))
    }

    return []
  } catch (error) {
    console.error("Failed to fetch memes:", error)
    return []
  }
}

export async function getTrendingMeme(): Promise<Meme | null> {
  const memes = await fetchMemes(1)
  return memes.length > 0 ? memes[0] : null
}

export async function getRandomMeme(): Promise<Meme | null> {
  const memes = await fetchMemes(10)
  if (memes.length === 0) return null
  return memes[Math.floor(Math.random() * memes.length)]
}
