interface Meme {
  title: string
  url: string
}

const RAPIDAPI_KEY = process.env.NEXT_PUBLIC_RAPIDAPI_KEY
const RAPIDAPI_HOST = "reddit-meme.p.rapidapi.com"

async function fetchMeme(endpoint: string): Promise<Meme | null> {
  if (!RAPIDAPI_KEY) {
    console.warn("RAPIDAPI_KEY not configured")
    return null
  }

  try {
    const response = await fetch(`https://${RAPIDAPI_HOST}${endpoint}`, {
      headers: {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": RAPIDAPI_HOST,
      },
    })

    if (!response.ok) {
      console.error("Meme API error:", response.statusText)
      return null
    }

    const data = await response.json()

    if (Array.isArray(data) && data.length > 0) {
      const meme = data[0]
      return {
        title: meme.title || "Funny Meme",
        url: meme.url,
      }
    }

    return null
  } catch (error) {
    console.error("Failed to fetch meme:", error)
    return null
  }
}

export async function getTrendingMeme(): Promise<Meme | null> {
  return fetchMeme("/memes/trending?limit=1")
}

export async function getRandomMeme(): Promise<Meme | null> {
  return fetchMeme("/memes/random?limit=1")
}
