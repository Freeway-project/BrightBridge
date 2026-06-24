"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openSupportChatAction } from "@/lib/chat/actions";

export function ChatWithAdminButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    try {
      const { conversationId } = await openSupportChatAction();
      router.push(`/chat/${conversationId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open support chat. Please try again.");
      setPending(false);
    }
  }

  return (
    <div className="space-y-1">
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
      {error && (
        <p className="flex items-start gap-1.5 text-xs text-destructive">
          <AlertCircle className="mt-0.5 size-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
