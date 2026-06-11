import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-center p-8">
      <p className="text-5xl font-bold text-muted-foreground/30">404</p>
      <div className="space-y-1 max-w-xs">
        <h2 className="text-base font-semibold">Page not found</h2>
        <p className="text-sm text-muted-foreground">
          This page doesn&apos;t exist or you don&apos;t have access to it.
        </p>
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link href="/dashboard">Go to dashboard</Link>
      </Button>
    </div>
  )
}
