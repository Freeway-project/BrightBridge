"use client"

import { useEffect } from "react"

/**
 * Screen-only toolbar for the print/export view.
 *
 * Triggers the browser print dialog (Save as PDF) once on mount, and renders a
 * small sticky bar with manual Print / Close controls. Everything here is
 * hidden from the printed output via the `print:hidden` utility.
 */
export function PrintToolbar({ autoPrint = true }: { autoPrint?: boolean }) {
  useEffect(() => {
    if (!autoPrint) return
    // Defer until after first paint so fonts/layout settle before the dialog opens.
    const id = window.setTimeout(() => window.print(), 350)
    return () => window.clearTimeout(id)
  }, [autoPrint])

  return (
    <div className="print:hidden sticky top-0 z-50 flex items-center justify-between gap-4 border-b border-gray-200 bg-white/95 px-6 py-3 backdrop-blur">
      <p className="text-sm text-gray-600">
        Use <span className="font-semibold">Save as PDF</span> as the destination in the print dialog to export this review.
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => window.print()}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
        >
          Print / Save as PDF
        </button>
        <button
          onClick={() => window.close()}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100"
        >
          Close
        </button>
      </div>
    </div>
  )
}
