interface Meme {
  title: string
  url: string
}

const RAPIDAPI_KEY = process.env.NEXT_PUBLIC_RAPIDAPI_KEY
const RAPIDAPI_HOST = "reddit-meme.p.rapidapi.com"

export async function getRandomMeme(): Promise<Meme | null> {
  if (!RAPIDAPI_KEY) {
    console.warn("RAPIDAPI_KEY not configured")
    return null
  }

  try {
    const response = await fetch(`https://${RAPIDAPI_HOST}/memes/trending?limit=1`, {
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
