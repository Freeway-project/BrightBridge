import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DeploymentDetector } from "@/components/shared/deployment-detector";
import { GlobalPointer } from "@/components/shared/global-pointer";
import { Analytics } from "@vercel/analytics/next";
import { type ReactNode } from "react";
import { getDeploymentVersion } from "@/lib/deployment-version";

export const metadata: Metadata = {
  title: "CourseBridge",
  description: "Course migration review workflow platform"
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  const currentVersion = getDeploymentVersion();

  return (
    <html lang="en" className={cn("font-sans", GeistSans.className)}>
      <body>
        <TooltipProvider>
          {children}
        </TooltipProvider>
        <DeploymentDetector initialVersion={currentVersion} />
        <GlobalPointer />
        <Analytics />
        <Toaster
          closeButton
          position="top-right"
          expand
          visibleToasts={8}
          toastOptions={{
            classNames: {
              toast: "cb-toast",
              title: "cb-toast-title",
              description: "cb-toast-description",
              actionButton: "cb-toast-action",
              cancelButton: "cb-toast-cancel",
              closeButton: "cb-toast-close"
            }
          }}
        />
      </body>
    </html>
  );
}
