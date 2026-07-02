import {
  BookOpen,
  Bot,
  ClipboardList,
  Send,
  GraduationCap,
  LayoutDashboard,
  Users,
  FileText,
  Clock,
  HelpCircle,
  Bell,
  BarChart3,
  Network,
  MessageSquare,
  FileCode2,
  type LucideIcon,
} from "lucide-react"
import type { Role } from "@coursebridge/workflow"

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
}

const chatEntry: NavItem = { label: "Chat", href: "/chat", icon: MessageSquare }

export const NAV_ITEMS: Record<Role, NavItem[]> = {
  // standard_user (TA) gets chat as a tab on the TA dashboard, not a nav item
  standard_user: [
    { label: "My Courses",  href: "/ta",        icon: BookOpen },
    { label: "Converter",   href: "/content-converter", icon: FileCode2 },
    { label: "Notifications", href: "/notifications", icon: Bell },
    { label: "Guide",       href: "/guide",      icon: HelpCircle },
  ],
  admin_full: [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Stats",     href: "/admin/stats", icon: BarChart3 },
    { label: "Assistant", href: "/assistant", icon: Bot },
    { label: "Hierarchy", href: "/hierarchy", icon: Network },
    { label: "Converter", href: "/content-converter", icon: FileCode2 },
    { label: "Notifications", href: "/notifications", icon: Bell },
    { label: "Migration", href: "/migration", icon: FileText },
    { label: "Guide",       href: "/guide",      icon: HelpCircle },
    chatEntry,
  ],
  // admin_viewer mirrors admin_full's dashboard but read-only. Omits the
  // write-capable tools admin_viewer can't open (Converter, Assistant).
  admin_viewer: [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Stats",     href: "/admin/stats", icon: BarChart3 },
    { label: "Hierarchy", href: "/hierarchy", icon: Network },
    { label: "Migration", href: "/migration", icon: FileText },
    { label: "Notifications", href: "/notifications", icon: Bell },
    { label: "Guide",       href: "/guide",      icon: HelpCircle },
    chatEntry,
  ],
  instructor: [
    { label: "My Course Reviews", href: "/instructor", icon: GraduationCap },
    { label: "Notifications", href: "/notifications", icon: Bell },
    { label: "Guide",       href: "/guide",      icon: HelpCircle },
    chatEntry,
  ],
  super_admin: [
    { label: "Dashboard", href: "/super-admin", icon: LayoutDashboard },
    { label: "Stats",     href: "/admin/stats", icon: BarChart3 },
    { label: "Assistant", href: "/assistant", icon: Bot },
    { label: "Hierarchy", href: "/hierarchy", icon: Network },
    { label: "Converter", href: "/content-converter", icon: FileCode2 },
    { label: "Notifications", href: "/notifications", icon: Bell },
    { label: "Migration", href: "/migration", icon: FileText },
    { label: "Guide",       href: "/guide",      icon: HelpCircle },
    chatEntry,
  ],
  provost: [
    { label: "Dashboard",    href: "/provost",     icon: LayoutDashboard },
    { label: "Assistant",    href: "/assistant",   icon: Bot },
    { label: "Hierarchy",    href: "/hierarchy",   icon: Network },
    { label: "Notifications", href: "/notifications", icon: Bell },
    { label: "Guide",        href: "/guide",       icon: HelpCircle },
    chatEntry,
  ],
}
