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
  ],
  admin_full: [
    { label: "Assignments", href: "/admin", icon: ClipboardList },
    { label: "Review Queue", href: "/admin/queue", icon: Clock },
  ],
  admin_viewer: [
    { label: "Handoff Queue", href: "/communications", icon: Send },
  ],
  instructor: [
    { label: "My Course Reviews", href: "/instructor", icon: GraduationCap },
  ],
  super_admin: [
    { label: "Overview", href: "/super-admin", icon: LayoutDashboard },
    { label: "Courses", href: "/super-admin/courses", icon: BookOpen },
    { label: "Users", href: "/super-admin/users", icon: Users },
    { label: "Organization", href: "/super-admin/organization", icon: Building2 },
    { label: "Audit Trail", href: "/super-admin/audit", icon: FileText },
  ],
}
