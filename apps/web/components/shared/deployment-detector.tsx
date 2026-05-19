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

const CHECK_INTERVAL = 1000 * 60 * 15; // Check every 15 minutes
const UPDATE_APPLIED_FLAG = "coursebridge:update-applied";
type NotificationMode = "auto" | "force-on" | "force-off";
// Manual switch for demos/testing:
// - "auto": current API-version behavior
// - "force-on": always show notification UI
// - "force-off": never show notification UI
const NOTIFICATION_MODE: NotificationMode = "auto";

export function DeploymentDetector({ initialVersion }: DeploymentDetectorProps) {
  const [showNotification, setShowNotification] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const hasNotified = useRef(false);
  const hasChunkWarning = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.sessionStorage.getItem(UPDATE_APPLIED_FLAG) === "1") {
      window.sessionStorage.removeItem(UPDATE_APPLIED_FLAG);
      toast.success("Deployment applied", {
        description: "You are now running the latest CourseBridge update.",
        duration: 5000,
        position: "bottom-left",
      });
    }

    if (NOTIFICATION_MODE === "force-off") return;
    if (NOTIFICATION_MODE === "force-on") {
      setShowNotification(true);
      setIsMinimized(false);
      return;
    }

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
    const openUpdatePanel = () => {
      setIsMinimized(false);
      setShowNotification(true);
    };
    window.addEventListener("coursebridge:open-update-notice", openUpdatePanel);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      window.removeEventListener("error", handleChunkError);
      window.removeEventListener("coursebridge:open-update-notice", openUpdatePanel);
    };
  }, [initialVersion]);

  return (
    <>
      <AnimatePresence>
        {showNotification && (
          <DeploymentNotification
            onRefresh={() => {
              if (typeof window !== "undefined") {
                window.sessionStorage.setItem(UPDATE_APPLIED_FLAG, "1");
              }
              window.location.reload();
            }}
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
