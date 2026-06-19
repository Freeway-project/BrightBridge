"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openSupportChatAction } from "@/lib/chat/actions";

export function ChatWithAdminButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    try {
      const { conversationId } = await openSupportChatAction();
      router.push(`/chat/${conversationId}`);
      router.refresh();
    } catch {
      setPending(false);
    }
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      className="w-full justify-start gap-2"
      onClick={handleClick}
      disabled={pending}
    >
      <LifeBuoy className="h-4 w-4" />
      {pending ? "Opening…" : "Chat with Admin"}
    </Button>
  );
}
