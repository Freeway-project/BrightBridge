'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, BarChart2, Users, Circle } from 'lucide-react'
import { subscribeToOnlineUsers, type OnlineUser } from '@/lib/online-presence'

const dashboardUrl = process.env.NEXT_PUBLIC_POSTHOG_DASHBOARD_URL
const projectId = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_ID
const posthogBase = projectId
  ? `https://us.posthog.com/project/${projectId}`
  : 'https://us.posthog.com'

function useOnlineUsers() {
  const [users, setUsers] = useState<OnlineUser[]>([])

  useEffect(() => {
    return subscribeToOnlineUsers(setUsers)
  }, [])

  return users
}

function OnlineUsersCard() {
  const users = useOnlineUsers()

  return (
    <Card className="shadow-sm border-border/60">
      <CardHeader className="pb-3 px-4 pt-4">
        <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          Users Online Now
          <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0 h-4">
            {users.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {users.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No users detected yet.</p>
        ) : (
          <ul className="space-y-2">
            {users.map((u) => (
              <li key={u.userId} className="flex items-center gap-2 text-sm">
                <Circle className="h-2 w-2 fill-green-500 text-green-500 shrink-0" />
                <span className="font-medium truncate">{u.name ?? u.email}</span>
                <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0 h-4 shrink-0 capitalize">
                  {u.role.replace(/_/g, ' ')}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function PostHogGuideCard() {
  return (
    <Card className="shadow-sm border-border/60">
      <CardHeader className="pb-3 px-4 pt-4">
        <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <BarChart2 className="h-3.5 w-3.5" />
          PostHog Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3 text-sm text-muted-foreground">
        <p>Analytics are tracked via PostHog. Users are identified by email, name, and role on every login.</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <a href={`${posthogBase}/insights`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-3.5 w-3.5" />
              Insights
            </a>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href={`${posthogBase}/persons`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-3.5 w-3.5" />
              Users
            </a>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href={`${posthogBase}/replay`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-3.5 w-3.5" />
              Session Replay
            </a>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href={`${posthogBase}/dashboard`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-3.5 w-3.5" />
              Dashboards
            </a>
          </Button>
        </div>
        {!dashboardUrl && (
          <details className="mt-2">
            <summary className="cursor-pointer text-xs font-medium text-foreground">
              Embed a PostHog dashboard here
            </summary>
            <ol className="mt-2 list-decimal list-inside space-y-1.5 text-xs">
              <li>Go to PostHog → <strong>Dashboards</strong></li>
              <li>Open your dashboard → <strong>Share</strong> → enable public sharing → copy URL</li>
              <li>
                Add to <code className="bg-muted px-1 py-0.5 rounded">.env.production</code>:
                <pre className="mt-1 bg-muted px-3 py-2 rounded overflow-x-auto">
                  NEXT_PUBLIC_POSTHOG_DASHBOARD_URL=https://us.posthog.com/shared_dashboard/xxxx
                </pre>
              </li>
              <li>Rebuild and restart: <code className="bg-muted px-1 py-0.5 rounded">npm run build && pm2 restart brightbridge</code></li>
            </ol>
          </details>
        )}
      </CardContent>
    </Card>
  )
}

export function AnalyticsView() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <OnlineUsersCard />
        <PostHogGuideCard />
      </div>

      {dashboardUrl && (
        <Card className="shadow-sm border-border/60 overflow-hidden">
          <CardHeader className="pb-3 px-4 pt-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              PostHog Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <iframe
              src={dashboardUrl}
              className="w-full border-0"
              style={{ height: '75vh' }}
              allowFullScreen
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
