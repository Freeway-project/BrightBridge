import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { DevRoleSwitcher } from "@/components/dev-role-switcher";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

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
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body>
        {children}
        <DevRoleSwitcher />
      </body>
    </html>
  );
}
