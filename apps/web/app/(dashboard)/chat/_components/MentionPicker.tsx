"use client";

import {
  Command,
  CommandList,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";

interface Member {
  id: string;
  name: string;
}

export function MentionPicker({
  open,
  query,
  members,
  onPick,
  onClose,
}: {
  open: boolean;
  query: string;
  members: Member[];
  onPick: (member: Member) => void;
  onClose: () => void;
}) {
  if (!open) return null;

  const filtered = members.filter((m) =>
    m.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="absolute bottom-full left-0 mb-1 w-64 rounded-md border bg-popover shadow">
      <Command>
        <CommandList>
          {filtered.length > 0 ? (
            <CommandGroup>
              {filtered.map((member) => (
                <CommandItem
                  key={member.id}
                  value={member.id}
                  onSelect={() => {
                    onPick(member);
                    onClose();
                  }}
                >
                  <span className="text-sm">{member.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : (
            <p className="px-3 py-2 text-xs text-muted-foreground">No members found.</p>
          )}
        </CommandList>
      </Command>
    </div>
  );
}
