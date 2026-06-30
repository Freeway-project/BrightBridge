export type AnnouncementSeverity = "info" | "warning" | "critical"

export type ActiveAnnouncement = {
  id: string
  message: string
  severity: AnnouncementSeverity
  updatedAt: string
  isDismissed: boolean
}

export type CurrentAnnouncement = {
  id: string
  message: string
  severity: AnnouncementSeverity
  isActive: boolean
  updatedAt: string
}
