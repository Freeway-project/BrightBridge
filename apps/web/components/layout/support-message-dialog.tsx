"use client";

import { useState, useTransition } from "react";
import { LifeBuoy, Zap } from "lucide-react";
import { toast } from "sonner";
import { pokeItSupportAction } from "@/app/(dashboard)/support/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type SupportMessageDialogProps = {
  collapsed: boolean;
};

export function SupportMessageDialog({ collapsed }: SupportMessageDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const trigger = (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        "h-9 w-full justify-start gap-2.5 rounded-xl px-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 hover:bg-primary/10 hover:text-primary",
        collapsed && "justify-center px-0",
      )}
    >
      <LifeBuoy className="size-3.5 shrink-0" />
      {!collapsed && <span>Poke Support</span>}
    </Button>
  );

  function poke() {
    startTransition(async () => {
      const result = await pokeItSupportAction();
      if (result.kind === "error") {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>{trigger}</TooltipTrigger>
            <TooltipContent side="right" className="bg-popover border-border-icy font-black uppercase tracking-widest text-[9px]">
              Poke Support
            </TooltipContent>
          </Tooltip>
        ) : (
          trigger
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="size-5 text-primary" />
            Poke IT Support
          </DialogTitle>
          <DialogDescription>
            Send a quick nudge to the Super Admin that you need help. No message
            needed — they&apos;ll be notified right away.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={isPending} onClick={poke}>
            <Zap className="size-4" />
            Poke IT Support
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
