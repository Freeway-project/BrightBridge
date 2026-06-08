import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth/context";
import { assertMember } from "@/lib/chat/membership";
import { ChatPermissionError } from "@/lib/chat/types";
import { Composer } from "../../../_components/Composer";

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

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Thread</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-sm text-muted-foreground">Thread {parentId}</p>
      </div>
      <Composer conversationId={conversationId} parentId={parentId} />
    </div>
  );
}
