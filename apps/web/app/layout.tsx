import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DeploymentDetector } from "@/components/shared/deployment-detector";
import { CSPostHogProvider, PostHogPageview } from "@/components/providers/posthog-provider";
import { Suspense, type ReactNode } from "react";
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
        <CSPostHogProvider>
          <Suspense fallback={null}>
            <PostHogPageview />
          </Suspense>
          <TooltipProvider>
            {children}
          </TooltipProvider>
          <DeploymentDetector initialVersion={currentVersion} />
          <Toaster closeButton position="top-right" richColors expand visibleToasts={8} />
        </CSPostHogProvider>
      </body>
    </html>
  );
}
