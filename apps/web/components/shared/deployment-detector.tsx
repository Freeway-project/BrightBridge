"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hasUnsavedChanges } from "@/lib/deployment-sync";
import { DeploymentNotification, MinimizedUpdatePill } from "./deployment-notification";
import { AnimatePresence } from "motion/react";

interface DeploymentDetectorProps {
  initialVersion: string;
}

const CHECK_INTERVAL = 1000 * 60 * 5; // Check every 5 minutes

export function DeploymentDetector({ initialVersion }: DeploymentDetectorProps) {
  const [showNotification, setShowNotification] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const hasNotified = useRef(false);
  const hasChunkWarning = useRef(false);

  useEffect(() => {
    // Don't run in development or if already notified
    if (initialVersion === "development" || initialVersion === "dev") return;

    const checkVersion = async () => {
      if (hasNotified.current) return;

      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        
        const data = await res.json();
        
        if (data.version && data.version !== initialVersion && data.version !== "development") {
          hasNotified.current = true;
          setShowNotification(true);
        }
      } catch (error) {
        // Silently fail version checks
      }
    };

    // Initial check after a delay to not compete with app boot
    const initialTimer = setTimeout(checkVersion, 1000 * 30);

    const interval = setInterval(checkVersion, CHECK_INTERVAL);

    // Also catch ChunkLoadErrors (reactive check)
    const handleChunkError = (e: ErrorEvent) => {
      if (
        e.message?.includes("Loading chunk") || 
        e.message?.includes("CSS chunk") ||
        e.message?.includes("SyntaxError: Unexpected token '<'") // Often means HTML returned instead of JS chunk
      ) {
        if (!hasUnsavedChanges()) {
          window.location.reload();
          return;
        }

        if (hasChunkWarning.current) return;
        hasChunkWarning.current = true;
        toast.warning("Update Ready", {
          description: "Save your draft first, then click Refresh.",
          duration: Infinity,
          position: "bottom-left",
          action: (
            <Button size="sm" onClick={() => window.location.reload()} className="ml-auto">
              Refresh
            </Button>
          ),
        });
      }
    };

    window.addEventListener("error", handleChunkError);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      window.removeEventListener("error", handleChunkError);
    };
  }, [initialVersion]);

  return (
    <>
      <AnimatePresence>
        {showNotification && (
          <DeploymentNotification 
            onRefresh={() => window.location.reload()} 
            onDismiss={() => {
              setShowNotification(false);
              setIsMinimized(true);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMinimized && (
          <MinimizedUpdatePill 
            onClick={() => {
              setIsMinimized(false);
              setShowNotification(true);
            }} 
          />
        )}
      </AnimatePresence>
    </>
  );
}
