import { listConversationsForUser } from "@/lib/chat/queries";
import { getCourseChatInbox } from "@/lib/services/course-chat";
import { SidebarSearch } from "./SidebarSearch";
import { NewConversationMenu } from "./NewConversationMenu";
import { ChatWithAdminButton } from "./ChatWithAdminButton";
import { ChatSidebarTabs } from "./ChatSidebarTabs";

export async function Sidebar({
  currentUserId,
  canRequestSupport,
}: {
  currentUserId: string;
  canRequestSupport: boolean;
}) {
  const [conversations, courseChats] = await Promise.all([
    listConversationsForUser(currentUserId),
    getCourseChatInbox(),
  ]);
  return (
    <div className="flex h-full flex-col border-r border-border">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-semibold">Chat</span>
        <div className="flex items-center gap-1">
          <SidebarSearch />
          <NewConversationMenu />
        </div>
      </div>
      {canRequestSupport && (
        <div className="border-b border-border px-3 py-2">
          <ChatWithAdminButton />
        </div>
      )}
      <ChatSidebarTabs conversations={conversations} courseChats={courseChats} />
    </div>
  );
}
