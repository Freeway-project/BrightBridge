import "server-only";

import type {
  CommentRepository,
  CourseRepository,
  ProfileRepository,
  ReviewRepository,
} from "@/lib/repositories/contracts";
import { createSupabaseCommentRepository } from "./supabase/comment-repository";
import { createSupabaseCourseRepository } from "./supabase/course-repository";
import { createSupabaseProfileRepository } from "./supabase/profile-repository";
import { createSupabaseReviewRepository } from "./supabase/review-repository";

let courseRepository: CourseRepository | null = null;
let profileRepository: ProfileRepository | null = null;
let reviewRepository: ReviewRepository | null = null;
let commentRepository: CommentRepository | null = null;

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
