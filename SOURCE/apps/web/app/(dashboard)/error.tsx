"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"
import { ErrorDisplay } from "@/components/shared/error-display"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <ErrorDisplay
      title="Page failed to load"
      message="Something went wrong loading this page. Your work is safe — try again or refresh."
      reset={reset}
    />
  )
}
