import Link from "next/link";
import { listConversationsForUser } from "@/lib/chat/queries";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { SidebarSearch } from "./SidebarSearch";
import { NewConversationMenu } from "./NewConversationMenu";

export async function Sidebar({ currentUserId }: { currentUserId: string }) {
  const conversations = await listConversationsForUser(currentUserId);
  return (
    <div className="flex h-full flex-col border-r border-border">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-semibold">Chat</span>
        <div className="flex items-center gap-1">
          <SidebarSearch />
          <NewConversationMenu />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <ul>
          {conversations.map((c) => (
            <li key={c.id}>
              <Link
                href={`/chat/${c.id}`}
                className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-muted/40"
              >
                <span className="truncate text-sm">{c.displayTitle}</span>
                {c.unreadCount > 0 && <Badge variant="secondary">{c.unreadCount}</Badge>}
              </Link>
            </li>
          ))}
          {conversations.length === 0 && (
            <li className="px-3 py-6 text-center text-xs text-muted-foreground">
              No conversations yet.
            </li>
          )}
        </ul>
      </ScrollArea>
    </div>
  );
}
