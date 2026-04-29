import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ErrorDisplayProps {
  title?: string
  message?: string
  reset?: () => void
}

export function ErrorDisplay({
  title = "Something went wrong",
  message = "An unexpected error occurred. The team has been notified.",
  reset,
}: ErrorDisplayProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-6 text-destructive" />
      </div>
      <div className="space-y-1 max-w-sm">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      {reset && (
        <Button variant="outline" size="sm" onClick={reset}>
          Try again
        </Button>
      )}
    </div>
  )
}
