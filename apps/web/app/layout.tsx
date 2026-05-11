import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DeploymentDetector } from "@/components/shared/deployment-detector";
import { ModalProvider } from "@/lib/contexts/modal-context";

export const metadata: Metadata = {
  title: "CourseBridge",
  description: "Course migration review workflow platform"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentVersion = process.env.VERCEL_GIT_COMMIT_SHA || "development";

  return (
    <html lang="en" className={cn("font-sans")}>
      <body>
        <ModalProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
          <DeploymentDetector initialVersion={currentVersion} />
          <Toaster closeButton position="top-right" richColors />
          <Analytics />
          <SpeedInsights />
        </ModalProvider>
      </body>
    </html>
  );
}
