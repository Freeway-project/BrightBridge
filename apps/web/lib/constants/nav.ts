import {
  BookOpen,
  ClipboardList,
  Send,
  GraduationCap,
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  FileCode2,
  Clock,
  HelpCircle,
  Bell,
  BarChart3,
  type LucideIcon,
} from "lucide-react"
import type { Role } from "@coursebridge/workflow"

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
}

export const NAV_ITEMS: Record<Role, NavItem[]> = {
  standard_user: [
    { label: "My Courses",  href: "/ta",        icon: BookOpen },
    { label: "Converter",   href: "/content-converter", icon: FileCode2 },
    { label: "Notifications", href: "/notifications", icon: Bell },
    { label: "Guide",       href: "/guide",      icon: HelpCircle },
  ],
  admin_full: [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Stats",     href: "/admin/stats", icon: BarChart3 },
    { label: "Converter", href: "/content-converter", icon: FileCode2 },
    { label: "Notifications", href: "/notifications", icon: Bell },
    { label: "Migration", href: "/migration", icon: FileText },
    { label: "Guide",       href: "/guide",      icon: HelpCircle },
  ],
  admin_viewer: [
    { label: "Handoff Queue", href: "/communications", icon: Send },
    { label: "Notifications", href: "/notifications", icon: Bell },
    { label: "Guide",       href: "/guide",      icon: HelpCircle },
  ],
  instructor: [
    { label: "My Course Reviews", href: "/instructor", icon: GraduationCap },
    { label: "Notifications", href: "/notifications", icon: Bell },
    { label: "Guide",       href: "/guide",      icon: HelpCircle },
  ],
  super_admin: [
    { label: "Dashboard", href: "/super-admin", icon: LayoutDashboard },
    { label: "Stats",     href: "/admin/stats", icon: BarChart3 },
    { label: "Notifications", href: "/notifications", icon: Bell },
    { label: "Migration", href: "/migration", icon: FileText },
    { label: "Guide",       href: "/guide",      icon: HelpCircle },
  ],
  provost: [
    { label: "Overview",     href: "/provost",     icon: LayoutDashboard },
    { label: "Organization", href: "/provost/org", icon: Building2 },
    { label: "Notifications", href: "/notifications", icon: Bell },
    { label: "Guide",        href: "/guide",       icon: HelpCircle },
  ],
}
