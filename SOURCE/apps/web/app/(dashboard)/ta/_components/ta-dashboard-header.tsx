"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface TaDashboardHeaderProps {
  firstName: string;
  subtitle?: string;
}

export function TaDashboardHeader({ firstName, subtitle }: TaDashboardHeaderProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      router.refresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [router]);

  return (
    <div className="relative mb-5 flex flex-row items-start justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          Hey, <span className="bg-gradient-to-r from-accent-indigo to-violet-500 bg-clip-text text-transparent">{firstName}</span>.
        </h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleManualRefresh}
        disabled={isRefreshing}
        className="h-8 gap-2 text-muted-foreground hover:text-foreground"
      >
        <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin")} />
        <span className="hidden sm:inline text-xs font-medium">Refresh</span>
      </Button>
    </div>
  );
}
