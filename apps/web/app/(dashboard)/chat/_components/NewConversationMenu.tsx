"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
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
import { createDmAction, createGroupAction } from "@/lib/chat/actions";

type UserOption = { id: string; name: string; email: string };

function UserPicker({
  value,
  onChange,
}: {
  value: UserOption | null;
  onChange: (u: UserOption | null) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<UserOption[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const ctrl = new AbortController();
    fetch(`/api/chat/users?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then(setResults)
      .catch(() => {});
    return () => ctrl.abort();
  }, [q]);

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-input bg-muted/30 px-3 py-2 text-sm">
        <span className="flex-1 font-medium">{value.name}</span>
        <span className="text-xs text-muted-foreground">{value.email}</span>
        <button
          type="button"
          onClick={() => { onChange(null); setQ(""); setTimeout(() => inputRef.current?.focus(), 0); }}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name or email…"
        autoFocus
      />
      {results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-lg">
          {results.map((u) => (
            <button
              key={u.id}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50"
              onClick={() => { onChange(u); setQ(""); setResults([]); }}
            >
              <div className="font-medium">{u.name}</div>
              <div className="text-xs text-muted-foreground">{u.email}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MultiUserPicker({
  selected,
  onChange,
}: {
  selected: UserOption[];
  onChange: (u: UserOption[]) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<UserOption[]>([]);
  const selectedIds = new Set(selected.map((u) => u.id));

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const ctrl = new AbortController();
    fetch(`/api/chat/users?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((data: UserOption[]) => setResults(data.filter((u) => !selectedIds.has(u.id))))
      .catch(() => {});
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((u) => (
            <span key={u.id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs">
              {u.name}
              <button
                type="button"
                onClick={() => onChange(selected.filter((x) => x.id !== u.id))}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Add members by name or email…"
        />
        {results.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-lg">
            {results.map((u) => (
              <button
                key={u.id}
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50"
                onClick={() => { onChange([...selected, u]); setQ(""); setResults([]); }}
              >
                <div className="font-medium">{u.name}</div>
                <div className="text-xs text-muted-foreground">{u.email}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function NewConversationMenu() {
  const router = useRouter();
  const [dmOpen, setDmOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [dmPartner, setDmPartner] = useState<UserOption | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState<UserOption[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetDm() { setDmPartner(null); setError(null); }
  function resetGroup() { setGroupName(""); setGroupMembers([]); setError(null); }

  async function handleCreateDm() {
    if (!dmPartner) return;
    setPending(true);
    setError(null);
    try {
      const result = await createDmAction({ otherUserId: dmPartner.id });
      setDmOpen(false);
      resetDm();
      router.push(`/chat/${result.conversationId}`);
    } catch {
      setError("Failed to start conversation. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function handleCreateGroup() {
    if (!groupName.trim() || groupMembers.length === 0) return;
    setPending(true);
    setError(null);
    try {
      const result = await createGroupAction({
        name: groupName.trim(),
        memberIds: groupMembers.map((m) => m.id),
      });
      setGroupOpen(false);
      resetGroup();
      router.push(`/chat/${result.conversationId}`);
    } catch {
      setError("Failed to create group. Please try again.");
    } finally {
      setPending(false);
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
          <DropdownMenuItem onSelect={() => { resetDm(); setDmOpen(true); }}>New DM</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => { resetGroup(); setGroupOpen(true); }}>New group</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* DM dialog */}
      <Dialog open={dmOpen} onOpenChange={(o) => { setDmOpen(o); if (!o) resetDm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>New direct message</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <UserPicker value={dmPartner} onChange={setDmPartner} />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDmOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateDm} disabled={!dmPartner || pending}>
              {pending ? "Starting…" : "Start DM"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group dialog */}
      <Dialog open={groupOpen} onOpenChange={(o) => { setGroupOpen(o); if (!o) resetGroup(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>New group</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder="Group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
            <MultiUserPicker selected={groupMembers} onChange={setGroupMembers} />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreateGroup}
              disabled={!groupName.trim() || groupMembers.length === 0 || pending}
            >
              {pending ? "Creating…" : "Create group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
