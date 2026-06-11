"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Composer } from "./Composer";

export function ThreadPanel({
  conversationId,
  parentId,
  open,
  onOpenChange,
}: {
  conversationId: string;
  parentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-96 flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border px-4 py-3">
          <SheetTitle className="text-sm">Thread</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-sm text-muted-foreground">
            Thread view for {parentId} — not yet wired.
          </p>
        </div>
        <Composer conversationId={conversationId} parentId={parentId} />
      </SheetContent>
    </Sheet>
  );
}
