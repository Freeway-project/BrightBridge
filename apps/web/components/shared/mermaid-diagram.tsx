"use client"

import { useEffect, useId, useState } from "react"

/**
 * Renders a Mermaid diagram source string to inline SVG on the client.
 * Mermaid is dynamically imported so it stays out of the server/initial bundle.
 */
export function MermaidDiagram({ chart }: { chart: string }) {
  const [svg, setSvg] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const reactId = useId()
  // Mermaid render ids must be a valid CSS/DOM id (no colons from useId()).
  const id = `mmd-${reactId.replace(/[^a-zA-Z0-9]/g, "")}`

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const mermaid = (await import("mermaid")).default
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "loose",
          theme: "neutral",
          flowchart: { htmlLabels: true, useMaxWidth: true },
        })
        const { svg } = await mermaid.render(id, chart)
        if (active) setSvg(svg)
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed to render diagram")
      }
    })()
    return () => {
      active = false
    }
  }, [chart, id])

  if (error) {
    return (
      <pre className="rounded-md bg-muted p-3 text-xs text-destructive whitespace-pre-wrap">
        {error}
      </pre>
    )
  }

  if (!svg) {
    return <div className="h-40 animate-pulse rounded-md bg-muted" />
  }

  return (
    <div
      className="overflow-x-auto [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
