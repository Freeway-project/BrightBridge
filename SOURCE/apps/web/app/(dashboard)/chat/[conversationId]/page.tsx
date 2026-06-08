import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth/context";
import { assertMember } from "@/lib/chat/membership";
import { listMessages } from "@/lib/chat/queries";
import { ChatSseClient } from "../_components/ChatSseClient";

export default async function ConversationPage(
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const { conversationId } = await params;
  const ctx = await requireProfile();
  try { await assertMember(conversationId, ctx.userId); } catch { notFound(); }
  const initialMessages = await listMessages(conversationId, { limit: 50 });
  return (
    <ChatSseClient
      conversationId={conversationId}
      currentUserId={ctx.userId}
      initialMessages={initialMessages}
    />
  );
}
