"use client"

import { ReactNode } from "react"
import { CopyButton } from "@/components/ui/copy-button"

interface FormFieldWrapperProps {
  label: string
  value?: string
  children: ReactNode
  error?: string
}

export function FormFieldWrapper({ label, value, children, error }: FormFieldWrapperProps) {
  const hasCopyValue = value && value.trim().length > 0

  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <div className="flex gap-2 items-center">
        <div className="flex-1">
          {children}
        </div>
        {hasCopyValue && <CopyButton value={value} label={label} />}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </label>
  )
}
