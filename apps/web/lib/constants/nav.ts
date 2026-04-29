import {
  BookOpen,
  ClipboardList,
  Send,
  GraduationCap,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react"
import type { Role } from "@coursebridge/workflow"

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
}

export const NAV_ITEMS: Record<Role, NavItem[]> = {
  ta: [
    { label: "My Courses",  href: "/ta",        icon: BookOpen },
  ],
  admin: [
    { label: "Review Queue", href: "/admin",     icon: ClipboardList },
  ],
  communications: [
    { label: "Handoff Queue", href: "/communications", icon: Send },
  ],
  instructor: [
    { label: "My Course Reviews", href: "/instructor", icon: GraduationCap },
  ],
  super_admin: [
    { label: "System Overview", href: "/super-admin", icon: LayoutDashboard },
  ],
}
