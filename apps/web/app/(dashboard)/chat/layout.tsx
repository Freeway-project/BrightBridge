import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth/context";
import { isSupportAdmin } from "@/lib/chat/support-roles";
import { Sidebar } from "./_components/Sidebar";

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NEXT_PUBLIC_CHAT_ENABLED !== "true") notFound();
  const ctx = await requireProfile();
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-72 shrink-0">
        <Sidebar
          currentUserId={ctx.userId}
          canRequestSupport={!isSupportAdmin(ctx.profile.role)}
        />
      </aside>
      <div className="flex h-full min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
