"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command";

interface SearchHit {
  messageId: string;
  conversationId: string;
  snippet: string;
}

export function SidebarSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const search = useCallback((q: string) => {
    if (q.length < 2) { setHits([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/chat/search?q=${encodeURIComponent(q)}`);
        if (res.ok) setHits(await res.json());
      } catch {
        // search errors are non-fatal
      }
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const cancel = search(query);
    return cancel;
  }, [query, search]);

  function handleSelect(hit: SearchHit) {
    setOpen(false);
    setQuery("");
    setHits([]);
    router.push(`/chat/${hit.conversationId}?focus=${hit.messageId}`);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Search messages">
      <CommandInput
        placeholder="Search messages…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {hits.length === 0 && query.length >= 2 && (
          <CommandEmpty>No results.</CommandEmpty>
        )}
        {hits.length > 0 && (
          <CommandGroup heading="Messages">
            {hits.map((hit) => (
              <CommandItem
                key={hit.messageId}
                value={hit.messageId}
                onSelect={() => handleSelect(hit)}
              >
                <span
                  dangerouslySetInnerHTML={{ __html: hit.snippet }}
                  className="truncate text-sm"
                />
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
