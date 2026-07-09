"use client"

import { useState } from "react"
import { Link2, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { generateLoginLinkAction } from "@/app/(dashboard)/admin/actions"

/**
 * Trigger button + dialog that mints a never-expiring login link for one user and
 * shows it with a copy button. Generating again mints a fresh link and revokes
 * the prior one (server-side), so a shown link is always the only active one.
 */
export function LoginLinkDialog({
  profileId,
  userLabel,
}: {
  profileId: string
  userLabel: string
}) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [copied, setCopied] = useState(false)

  async function generate() {
    setPending(true)
    setError(null)
    try {
      const res = await generateLoginLinkAction(profileId)
      if (res.ok) {
        setUrl(res.url)
      } else {
        setError(res.error)
      }
    } catch {
      setError("Could not generate login link.")
    } finally {
      setPending(false)
    }
  }

  function onOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setUrl(null)
      setError(null)
      setCopied(false)
      void generate()
    }
  }

  async function copy() {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setError("Copy failed — select the link and copy manually.")
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 text-muted-foreground hover:text-foreground"
        title="Create login link"
        onClick={() => onOpenChange(true)}
      >
        <Link2 className="size-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium flex items-center gap-2">
              <Link2 className="size-4" /> Login link
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{userLabel}</p>

          {pending && (
            <p className="text-xs text-muted-foreground">Generating link…</p>
          )}

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          {url && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Input readOnly value={url} className="text-xs" onFocus={(e) => e.currentTarget.select()} />
                <Button type="button" size="icon" variant="outline" className="size-9 shrink-0" onClick={copy} title="Copy link">
                  {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
                </Button>
              </div>
              <p className="text-[11px] leading-4 text-muted-foreground">
                Anyone with this link is logged in as {userLabel} and lands on their
                dashboard. It never expires — generating a new one invalidates this one.
              </p>
            </div>
          )}

          {!pending && !url && !error && (
            <Button type="button" size="sm" onClick={generate}>Generate link</Button>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
