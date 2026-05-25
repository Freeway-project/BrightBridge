import type { Role } from "@coursebridge/workflow"

export type BillboardPriority = "info" | "warn" | "urgent"

export type GlobalChatMessage = {
  id: string
  authorId: string
  authorName: string
  authorRole: Role
  body: string
  createdAt: string
  editedAt: string | null
  deletedAt: string | null
}

export type BillboardPost = {
  id: string
  title: string
  body: string
  priority: BillboardPriority
  isActive: boolean
  startsAt: string | null
  endsAt: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type CreateBillboardInput = {
  title: string
  body: string
  priority?: BillboardPriority
  isActive?: boolean
  startsAt?: string | null
  endsAt?: string | null
}

export type UpdateBillboardInput = {
  title?: string
  body?: string
  priority?: BillboardPriority
  isActive?: boolean
  startsAt?: string | null
  endsAt?: string | null
}
