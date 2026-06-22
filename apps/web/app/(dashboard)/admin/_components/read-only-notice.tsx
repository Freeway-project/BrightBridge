import { Eye } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

/**
 * Shown in place of an action-only panel (e.g. the Assign TA / Create Instructor
 * forms) when the current user has read-only access (admin_viewer). Keeps the
 * dashboard tabs/layout identical to admin_full while making it clear the action
 * isn't available. The server actions behind those forms already reject the
 * admin_viewer role — this is the matching UI.
 */
export function ReadOnlyNotice({ title }: { title: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <Eye className="size-8 text-muted-foreground/50" />
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          You have read-only access. This action is available to full admins only.
        </p>
      </CardContent>
    </Card>
  )
}
