import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth/context";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Sidebar } from "./_components/Sidebar";

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NEXT_PUBLIC_CHAT_ENABLED !== "true") notFound();
  const ctx = await requireProfile();
  return (
    <div className="flex h-screen overflow-hidden">
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize={26} minSize={18} maxSize={40}>
          <Sidebar currentUserId={ctx.userId} />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={74}>
          <div className="flex h-full flex-col">{children}</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
