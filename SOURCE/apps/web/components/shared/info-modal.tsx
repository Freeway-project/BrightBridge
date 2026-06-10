"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle2, AlertTriangle, Info, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

type InfoModalVariant = "success" | "warning" | "info" | "error"

interface InfoModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  variant?: InfoModalVariant
}

const VARIANT_CONFIG: Record<InfoModalVariant, {
  icon: React.ElementType
  iconClass: string
  bgClass: string
}> = {
  success: {
    icon: CheckCircle2,
    iconClass: "text-emerald-500",
    bgClass: "bg-emerald-500/10",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-amber-500",
    bgClass: "bg-amber-500/10",
  },
  info: {
    icon: Info,
    iconClass: "text-blue-500",
    bgClass: "bg-blue-500/10",
  },
  error: {
    icon: XCircle,
    iconClass: "text-red-500",
    bgClass: "bg-red-500/10",
  },
}

export function InfoModal({
  open,
  onClose,
  title,
  description,
  variant = "info",
}: InfoModalProps) {
  const { icon: Icon, iconClass, bgClass } = VARIANT_CONFIG[variant]

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="flex flex-col items-center gap-4 pt-2 text-center">
            <div className={cn("flex size-14 items-center justify-center rounded-full", bgClass)}>
              <Icon className={cn("size-7", iconClass)} />
            </div>
            <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </DialogHeader>
        <DialogFooter className="mt-2">
          <Button className="w-full" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
