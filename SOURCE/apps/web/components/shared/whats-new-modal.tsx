"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Info,
  LayoutList,
  MessageSquare,
  Sparkles,
  Zap,
} from "lucide-react"

interface WhatsNewItem {
  icon: React.ElementType
  color: string
  title: string
  body: string
}

const WHATS_NEW: WhatsNewItem[] = [
  {
    icon: LayoutList,
    color: "text-blue-400",
    title: "In Progress tab is smarter",
    body: "Courses you've already opened now always appear under \"In Progress\" — not buried in \"Todo\".",
  },
  {
    icon: MessageSquare,
    color: "text-amber-400",
    title: "Explain your fixes when resubmitting",
    body: "If an admin asked for changes, the Submit page now asks what you fixed before you can send it back.",
  },
  {
    icon: ArrowRight,
    color: "text-amber-400",
    title: "Admins see your resubmit note",
    body: "When you resubmit, the admin course page shows an amber banner with your note and how many times the course has been submitted.",
  },
  {
    icon: HelpCircle,
    color: "text-violet-400",
    title: "\"Raise a Question\" now opens a form",
    body: "Instead of acting immediately, clicking Raise a Question opens a short form so your question is properly recorded.",
  },
  {
    icon: Zap,
    color: "text-orange-400",
    title: "Provision issues block the course automatically",
    body: "Creating a blocking issue while a course is with the instructor now automatically flags it for admin review — no extra step needed.",
  },
  {
    icon: Info,
    color: "text-sky-400",
    title: "Admins see which round of questions this is",
    body: "The admin course page shows a blue banner with the question text and whether this is the 1st, 2nd, 3rd… round.",
  },
  {
    icon: CheckCircle2,
    color: "text-emerald-400",
    title: "Nudge when all escalations are resolved",
    body: "Once every escalation is resolved, the issue log shows a green banner prompting you to resubmit to admin.",
  },
]

interface WhatsNewModalProps {
  open: boolean
  onClose: () => void
}

export function WhatsNewModal({ open, onClose }: WhatsNewModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="size-4 text-primary" />
            </div>
            <DialogTitle className="text-base font-semibold">
              Just updated — here's what changed
            </DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            No action needed. Everything works the same unless noted below.
          </p>
        </DialogHeader>

        <ul className="mt-1 space-y-4">
          {WHATS_NEW.map((item) => (
            <li key={item.title} className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                <item.icon className={`size-4 ${item.color}`} />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground leading-snug">
                  {item.title}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.body}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex justify-end">
          <Button onClick={onClose} size="sm" className="px-5">
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
