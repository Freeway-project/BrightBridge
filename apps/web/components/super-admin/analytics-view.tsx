'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Circle } from 'lucide-react'
import { subscribeToOnlineUsers, type OnlineUser } from '@/lib/online-presence'

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

export function AnalyticsView() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <OnlineUsersCard />
      </div>
    </div>
  )
}
