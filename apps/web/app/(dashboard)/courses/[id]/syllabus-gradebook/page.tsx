import { Topbar } from "@/components/layout/topbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Props {
  params: Promise<{ id: string }>
}

export default async function SyllabusGradebookPage({ params }: Props) {
  const { id } = await params
  return (
    <>
      <Topbar title="Course Workspace" subtitle="Step 3 of 5 — Syllabus & Gradebook" />
      <main className="flex-1 overflow-y-auto p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-base">Syllabus & Gradebook — {id}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Coming soon.</p>
          </CardContent>
        </Card>
      </main>
    </>
  )
}
