import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth/context";
import { assertMember } from "@/lib/chat/membership";
import { listThread } from "@/lib/chat/queries";
import { ChatPermissionError } from "@/lib/chat/types";
import { ThreadSseClient } from "../../../_components/ThreadSseClient";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ conversationId: string; parentId: string }>;
}) {
  const { conversationId, parentId } = await params;
  const ctx = await requireProfile();
  try {
    await assertMember(conversationId, ctx.userId);
  } catch (err) {
    if (err instanceof ChatPermissionError) notFound();
    throw err;
  }

  const initialMessages = await listThread(parentId);
  if (initialMessages.length === 0) notFound();

  return (
    <ThreadSseClient
      conversationId={conversationId}
      parentId={parentId}
      currentUserId={ctx.userId}
      initialMessages={initialMessages}
    />
  );
}
