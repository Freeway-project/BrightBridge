import {
  BookOpen,
  ClipboardList,
  Send,
  GraduationCap,
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  Clock,
  HelpCircle,
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
    { label: "Guide",       href: "/guide",      icon: HelpCircle },
  ],
  admin_full: [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Migration", href: "/migration", icon: FileText },
    { label: "Guide",       href: "/guide",      icon: HelpCircle },
  ],
  admin_viewer: [
    { label: "Handoff Queue", href: "/communications", icon: Send },
    { label: "Guide",       href: "/guide",      icon: HelpCircle },
  ],
  instructor: [
    { label: "My Course Reviews", href: "/instructor", icon: GraduationCap },
    { label: "Guide",       href: "/guide",      icon: HelpCircle },
  ],
  super_admin: [
    { label: "Dashboard", href: "/super-admin", icon: LayoutDashboard },
    { label: "Migration", href: "/migration", icon: FileText },
    { label: "Guide",       href: "/guide",      icon: HelpCircle },
  ],
}
