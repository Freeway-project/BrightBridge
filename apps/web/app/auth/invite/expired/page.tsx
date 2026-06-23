import Link from "next/link";
import { LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InviteExpiredPage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-amber-500/10">
          <LinkIcon className="size-5 text-amber-600 dark:text-amber-400" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">This link can&apos;t be used</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your review link is invalid or has been revoked.
          </p>
        </div>

        <div className="rounded-lg border border-dashed border-border px-4 py-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Ask the CourseBridge team to resend your course review invite, then open the
            newest link from your email.
          </p>
        </div>

        <Button asChild variant="outline" className="w-full">
          <Link href="/auth/login">Go to sign in</Link>
        </Button>
      </div>
    </main>
  );
}
