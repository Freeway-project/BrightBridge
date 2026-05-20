interface Meme {
  title: string
  url: string
}

export async function getMeme(): Promise<Meme | null> {
  try {
    const response = await fetch("https://meme-api.com/gimme", {
      cache: "no-store",
    })

    if (!response.ok) {
      console.error("Meme API error:", response.statusText)
      return null
    }

    const data = await response.json()

    if (data.url && data.title) {
      return {
        title: data.title,
        url: data.url,
      }
    }

    return null
  } catch (error) {
    console.error("Failed to fetch meme:", error)
    return null
  }
}

export async function getTrendingMeme(): Promise<Meme | null> {
  return getMeme()
}

export async function getRandomMeme(): Promise<Meme | null> {
  return getMeme()
}
