import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth/context";
import { assertMember } from "@/lib/chat/membership";
import { getConversationDetail, listMessages } from "@/lib/chat/queries";
import { ChatSseClient } from "../_components/ChatSseClient";

export default async function ConversationPage(
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const { conversationId } = await params;
  const ctx = await requireProfile();
  try { await assertMember(conversationId, ctx.userId); } catch { notFound(); }
  const [initialMessages, conversation] = await Promise.all([
    listMessages(conversationId, { limit: 50 }),
    getConversationDetail(conversationId, ctx.userId),
  ]);
  if (!conversation) notFound();
  return (
    <ChatSseClient
      conversationId={conversationId}
      currentUserId={ctx.userId}
      initialMessages={initialMessages}
      conversation={conversation}
    />
  );
}
