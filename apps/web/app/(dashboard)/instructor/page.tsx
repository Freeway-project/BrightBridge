import { Topbar } from "@/components/layout/topbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function InstructorDashboardPage() {
  return (
    <>
      <Topbar title="My Course Reviews" />
      <main className="flex-1 overflow-y-auto p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-base">Instructor — My Course Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Coming soon.</p>
          </CardContent>
        </Card>
      </main>
    </>
  )
}
