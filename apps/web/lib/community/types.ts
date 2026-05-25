import type { Role } from "@coursebridge/workflow"

export type BillboardPriority = "info" | "warn" | "urgent"
export type CommunityAttachmentStatus = "pending" | "ready" | "deleted"
export type CommunityAttachmentTargetType = "chat" | "billboard"

export type CommunityAttachment = {
  id: string
  chatMessageId: string | null
  billboardPostId: string | null
  bucketName: string
  objectPath: string
  originalFilename: string
  contentType: string
  byteSize: number
  status: CommunityAttachmentStatus
  uploadedBy: string
  createdAt: string
  updatedAt: string
  signedUrl: string | null
}

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
