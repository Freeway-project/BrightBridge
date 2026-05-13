import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function CompletionCard() {
  return (
    <Card className="border-emerald-300/70 bg-emerald-50/80 dark:border-emerald-800 dark:bg-emerald-950/40">
      <CardHeader>
        <CardTitle className="text-emerald-700 dark:text-emerald-300">Back to work, gently.</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Nice reset. Keep your next step small and clear.</p>
      </CardContent>
    </Card>
  )
}
