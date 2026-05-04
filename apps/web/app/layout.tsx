import type { Metadata } from "next";
import "./globals.css";
import { GeistSans } from "geist/font/sans";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: "CourseBridge",
  description: "Course migration review workflow platform"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", GeistSans.variable)}>
      <body>
        <TooltipProvider>
          {children}
        </TooltipProvider>
        <Toaster closeButton position="top-right" richColors />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
