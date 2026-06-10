"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createDmAction, createGroupAction } from "@/lib/chat/actions";

export function NewConversationMenu() {
  const router = useRouter();
  const [dmOpen, setDmOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [otherUserId, setOtherUserId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [memberIds, setMemberIds] = useState("");

  async function handleCreateDm() {
    try {
      const result = await createDmAction({ otherUserId: otherUserId.trim() });
      setDmOpen(false);
      setOtherUserId("");
      router.push(`/chat/${result.conversationId}`);
    } catch (err) {
      console.error("createDmAction failed:", err);
    }
  }

  async function handleCreateGroup() {
    const ids = memberIds
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    try {
      const result = await createGroupAction({
        name: groupName.trim(),
        memberIds: ids,
      });
      setGroupOpen(false);
      setGroupName("");
      setMemberIds("");
      router.push(`/chat/${result.conversationId}`);
    } catch (err) {
      console.error("createGroupAction failed:", err);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="New conversation">
            <Plus className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setDmOpen(true)}>New DM</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setGroupOpen(true)}>New group</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* New DM dialog */}
      <Dialog open={dmOpen} onOpenChange={setDmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New direct message</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <label htmlFor="dm-user-id" className="text-sm font-medium">Other user ID (UUID)</label>
            <Input
              id="dm-user-id"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={otherUserId}
              onChange={(e) => setOtherUserId(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDmOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateDm} disabled={!otherUserId.trim()}>
              Start DM
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New group dialog */}
      <Dialog open={groupOpen} onOpenChange={setGroupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New group</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <label htmlFor="group-name" className="text-sm font-medium">Group name</label>
            <Input
              id="group-name"
              placeholder="e.g. Migration Team"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
            <label htmlFor="group-members" className="text-sm font-medium">Member IDs (one UUID per line)</label>
            <Textarea
              id="group-members"
              placeholder={"xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx\n..."}
              rows={4}
              value={memberIds}
              onChange={(e) => setMemberIds(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateGroup} disabled={!groupName.trim()}>
              Create group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
