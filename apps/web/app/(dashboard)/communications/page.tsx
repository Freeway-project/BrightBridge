import { Topbar } from "@/components/layout/topbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TweakableContent } from "@/components/shared/tweakable-content"

export default function CommunicationsDashboardPage() {
  return (
    <>
      <Topbar title="Handoff Queue" />
      <TweakableContent className="flex-1 overflow-y-auto p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-base">Communications — Handoff Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Coming soon.</p>
          </CardContent>
        </Card>
      </TweakableContent>
    </>
  )
}
