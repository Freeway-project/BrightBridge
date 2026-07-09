"use client"

import { useEffect, useState } from "react"
import { Search } from "lucide-react"
import { getRoleLabel } from "@coursebridge/workflow"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LoginLinkDialog } from "@/components/access/login-link-dialog"
import {
  searchUsersForLoginLinkAction,
  type LoginLinkUser,
} from "@/app/(dashboard)/admin/actions"

/**
 * Admin surface for minting passwordless login links. Search an existing user
 * (super_admins are excluded server-side) and generate a link that logs them into
 * their own dashboard.
 */
export function LoginLinkPanel() {
  const [term, setTerm] = useState("")
  const [results, setResults] = useState<LoginLinkUser[]>([])
  const [pending, setPending] = useState(false)
  const [loaded, setLoaded] = useState(false)

  async function runSearch(query: string) {
    setPending(true)
    try {
      const users = await searchUsersForLoginLinkAction(query.trim())
      setResults(users)
    } finally {
      setPending(false)
      setLoaded(true)
    }
  }

  // Load an initial page of users so the panel isn't empty on open.
  useEffect(() => {
    void runSearch("")
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Search className="size-4" /> Login Links
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-xs text-muted-foreground -mt-2">
          Create a passwordless magic link that logs an existing user straight into
          their dashboard. Super admins can&apos;t be targeted.
        </p>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void runSearch(term)
          }}
        >
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search by name, email, role…"
            className="h-9"
          />
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Searching…" : "Search"}
          </Button>
        </form>

        <div className="rounded-lg border border-border divide-y divide-border">
          {!loaded || pending ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Loading…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">No users found.</p>
          ) : (
            results.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{u.fullName ?? "No name"}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline" className="text-xs">{getRoleLabel(u.role)}</Badge>
                  <LoginLinkDialog profileId={u.id} userLabel={u.fullName ?? u.email} />
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
