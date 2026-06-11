"use server"

import { revalidatePath } from "next/cache"

export async function refreshAdminDashboard(): Promise<void> {
  revalidatePath("/admin")
}

export async function refreshAdminQueue(): Promise<void> {
  revalidatePath("/admin/queue")
}

export async function refreshAdminCourseDetail(courseId: string): Promise<void> {
  revalidatePath(`/admin/courses/${courseId}`)
}

export async function refreshCoursePage(courseId: string): Promise<void> {
  revalidatePath(`/admin/courses/${courseId}`)
  revalidatePath("/admin")
}

export async function refreshCourseWorkspace(courseId: string): Promise<void> {
  // Refresh all course workspace pages (metadata, review-matrix, etc.)
  revalidatePath(`/courses/${courseId}`)
  revalidatePath(`/courses/${courseId}/metadata`)
  revalidatePath(`/courses/${courseId}/review-matrix`)
  revalidatePath(`/courses/${courseId}/syllabus-gradebook`)
  revalidatePath(`/courses/${courseId}/issue-log`)
  revalidatePath(`/courses/${courseId}/submit`)
}

export async function refreshTAWorkspace(): Promise<void> {
  revalidatePath("/ta")
}
