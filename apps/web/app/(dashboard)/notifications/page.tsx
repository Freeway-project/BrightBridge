import Link from "next/link";
import { Bell, BellRing, CheckCircle2, CircleAlert, Clock, ExternalLink, LifeBuoy, MessageSquare, TriangleAlert } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Topbar } from "@/components/layout/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TweakableContent } from "@/components/shared/tweakable-content";
import { getNotificationsPageData, type NotificationItem } from "@/lib/notifications/queries";
import { cn } from "@/lib/utils";
import { HideButton } from "./_components/notification-row-client";
import { ClearAllButton } from "./_components/clear-all-button";

const KIND_ICON = {
  assignment: Bell,
  course_action: Clock,
  issue: TriangleAlert,
  comment: MessageSquare,
  support: LifeBuoy,
};

// Section headers for grouping "All notifications" by where each item came
// from (its `kind`). Order here is the order the groups render in.
const KIND_LABEL: { kind: NotificationItem["kind"]; label: string }[] = [
  { kind: "course_action", label: "Course actions" },
  { kind: "assignment", label: "Assignments" },
  { kind: "issue", label: "Issues" },
  { kind: "comment", label: "Comments" },
  { kind: "support", label: "Support" },
];

const TONE_STYLES = {
  default: "border-border bg-card",
  warning: "border-orange-400/30 bg-orange-500/5",
  danger: "border-red-400/30 bg-red-500/5",
  success: "border-emerald-400/30 bg-emerald-500/5",
};

export default async function NotificationsPage() {
  const { notifications, pendingCount, error } = await getNotificationsPageData();
  const pending = notifications.filter((item) => item.pending);
  const recent = notifications.filter((item) => !item.pending);

  return (
    <>
      <Topbar title="Notifications" subtitle="Pending work, issue updates, and recent activity" />
      <TweakableContent className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-background p-4 sm:p-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          {error && (
            <div className="flex items-start gap-3 rounded-md border border-orange-400/30 bg-orange-500/5 p-4 text-sm">
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-orange-400" />
              <div>
                <p className="font-medium text-foreground">Couldn&apos;t load notifications</p>
                <p className="text-muted-foreground">
                  There was a temporary problem reaching the server. Refresh the page to try again.
                </p>
              </div>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryCard label="Pending" value={pendingCount} icon={CircleAlert} emphasize />
            <SummaryCard label="All Notifications" value={notifications.length} icon={Bell} />
            <SummaryCard label="Cleared" value={recent.length} icon={CheckCircle2} />
          </div>

          <Card className="border-border/70 shadow-sm">
            <CardHeader className="border-b border-border/70 px-4 py-3">
              <CardTitle className="flex items-center justify-between gap-3 text-sm">
                <span className="inline-flex items-center gap-2">
                  <BellRing className="size-4 text-yellow-400" />
                  Pending attention
                </span>
                <div className="flex items-center gap-2">
                  <ClearAllButton disabled={pending.length === 0} />
                  <Badge className="border-yellow-400/30 bg-yellow-500/15 text-yellow-200">{pending.length}</Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {pending.length === 0 ? (
                <EmptyState title="No pending notifications" description="You are caught up for now." />
              ) : (
                <NotificationList items={pending} />
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader className="border-b border-border/70 px-4 py-3">
              <CardTitle className="flex items-center justify-between gap-3 text-sm">
                <span>All notifications</span>
                <Badge variant="outline">{notifications.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {notifications.length === 0 ? (
                <EmptyState title="No notifications yet" description="New assignments, open issues, and comments will appear here." />
              ) : (
                <GroupedNotificationList items={notifications} />
              )}
            </CardContent>
          </Card>
        </div>
      </TweakableContent>
    </>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  emphasize = false,
}: {
  label: string;
  value: number;
  icon: typeof Bell;
  emphasize?: boolean;
}) {
  return (
    <Card className={cn("border-border/70 shadow-sm", emphasize && "border-yellow-400/25 bg-yellow-500/5")}>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn("flex size-9 items-center justify-center rounded-md border border-border bg-muted/40", emphasize && "border-yellow-400/30 bg-yellow-500/10")}>
          <Icon className={cn("size-4 text-muted-foreground", emphasize && "text-yellow-400")} />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationList({ items }: { items: NotificationItem[] }) {
  return (
    <div className="divide-y divide-border/70">
      {items.map((item) => (
        <NotificationRow key={item.id} item={item} />
      ))}
    </div>
  );
}

// Groups notifications by `kind` (the source they came from) into labelled
// sections. Items keep their incoming date-descending order within each group;
// empty groups are skipped.
function GroupedNotificationList({ items }: { items: NotificationItem[] }) {
  return (
    <div className="divide-y divide-border/70">
      {KIND_LABEL.map(({ kind, label }) => {
        const group = items.filter((item) => item.kind === kind);
        if (group.length === 0) return null;
        const Icon = KIND_ICON[kind];
        return (
          <section key={kind}>
            <div className="flex items-center gap-2 bg-muted/30 px-4 py-2">
              <Icon className="size-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
              <Badge variant="outline" className="h-5 px-1.5 text-[10px]">{group.length}</Badge>
            </div>
            <NotificationList items={group} />
          </section>
        );
      })}
    </div>
  );
}

function NotificationRow({ item }: { item: NotificationItem }) {
  const Icon = KIND_ICON[item.kind];

  return (
    <div className={cn("grid gap-3 border-l-4 p-4 sm:grid-cols-[1fr_auto]", TONE_STYLES[item.tone])}>
      <div className="flex min-w-0 gap-3">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-background">
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold leading-5 text-foreground">{item.title}</h2>
            {item.pending && <Badge className="h-5 border-yellow-400/25 bg-yellow-500/10 px-1.5 text-[10px] text-yellow-200">Pending</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">{item.description}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {item.courseTitle && <span className="font-medium text-foreground/75">{item.courseTitle}</span>}
            <span>{item.meta}</span>
            <span>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:justify-end">
        <HideButton notificationId={item.id} />
        <Button asChild size="sm" variant="outline" className="h-8 gap-1.5">
          <Link href={item.href}>
            <ExternalLink className="size-3.5" />
            Open
          </Link>
        </Button>
      </div>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-14 text-center">
      <CheckCircle2 className="size-8 text-emerald-500/70" />
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
