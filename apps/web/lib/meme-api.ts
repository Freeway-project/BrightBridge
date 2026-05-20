interface Meme {
  title: string
  url: string
}

export async function getMeme(): Promise<Meme | null> {
  try {
    const response = await fetch("https://api.imgflip.com/get_memes", {
      cache: "no-store",
    })

    if (!response.ok) {
      console.error("Meme API error:", response.statusText)
      return null
    }

    const data = await response.json()

    if (data.success && data.data.memes && data.data.memes.length > 0) {
      const randomIndex = Math.floor(Math.random() * data.data.memes.length)
      const meme = data.data.memes[randomIndex]
      return {
        title: meme.name,
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
  return getMeme()
}

export async function getRandomMeme(): Promise<Meme | null> {
  return getMeme()
}
