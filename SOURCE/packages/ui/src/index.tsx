import type { ReactNode } from "react";

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-8 items-center rounded-md bg-[color:var(--accent)] px-3 text-sm font-medium text-[color:var(--accent-foreground)]">
      {children}
    </span>
  );
}
