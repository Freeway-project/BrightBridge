"use client"

import { Button } from "@/components/ui/button"
import { MessageSquare } from "lucide-react"

interface ChatIconButtonProps {
  onClick: () => void
  unreadCount?: number
}

export function ChatIconButton({ onClick, unreadCount = 0 }: ChatIconButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className="relative size-9 rounded-lg hover:bg-muted"
      title="Open discussion"
    >
      <MessageSquare className="size-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 size-5 flex items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Button>
  )
}
