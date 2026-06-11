"use client"

export function PrintToolbar() {
  return (
    <div className="flex items-center gap-2 border-b border-gray-200 px-8 py-3 print:hidden">
      <button
        onClick={() => window.print()}
        className="rounded bg-gray-900 px-4 py-1.5 text-sm text-white hover:bg-gray-700"
      >
        Print / Save as PDF
      </button>
      <button
        onClick={() => window.close()}
        className="rounded border border-gray-300 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
      >
        Close
      </button>
    </div>
  )
}
