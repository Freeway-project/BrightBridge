import "server-only";

import type {
  CommentRepository,
  CourseRepository,
  HierarchyRepository,
  ProfileRepository,
  ReviewRepository,
} from "@/lib/repositories/contracts";
import { createSupabaseCommentRepository } from "./supabase/comment-repository";
import { createSupabaseCourseRepository } from "./supabase/course-repository";
import { createSupabaseHierarchyRepository } from "./supabase/hierarchy-repository";
import { createSupabaseProfileRepository } from "./supabase/profile-repository";
import { createSupabaseReviewRepository } from "./supabase/review-repository";

let courseRepository: CourseRepository | null = null;
let profileRepository: ProfileRepository | null = null;
let reviewRepository: ReviewRepository | null = null;
let commentRepository: CommentRepository | null = null;
let hierarchyRepository: HierarchyRepository | null = null;

export function getCourseRepository(): CourseRepository {
  courseRepository ??= createSupabaseCourseRepository();
  return courseRepository;
}

export function getProfileRepository(): ProfileRepository {
  profileRepository ??= createSupabaseProfileRepository();
  return profileRepository;
}

export function getReviewRepository(): ReviewRepository {
  reviewRepository ??= createSupabaseReviewRepository();
  return reviewRepository;
}

export function getCommentRepository(): CommentRepository {
  commentRepository ??= createSupabaseCommentRepository();
  return commentRepository;
}

export function getHierarchyRepository(): HierarchyRepository {
  hierarchyRepository ??= createSupabaseHierarchyRepository();
  return hierarchyRepository;
}
