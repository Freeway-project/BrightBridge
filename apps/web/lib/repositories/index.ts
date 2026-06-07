import "server-only";

import type {
  CommentRepository,
  CourseRepository,
  EscalationRepository,
  HierarchyRepository,
  ProfileRepository,
  ReviewRepository,
} from "@/lib/repositories/contracts";
import { createSupabaseCommentRepository } from "./supabase/comment-repository";
import { createSupabaseCourseRepository } from "./supabase/course-repository";
import { createSupabaseEscalationRepository } from "./supabase/escalation-repository";
import { createSupabaseHierarchyRepository } from "./supabase/hierarchy-repository";
import { createSupabaseProfileRepository } from "./supabase/profile-repository";
import { createSupabaseReviewRepository } from "./supabase/review-repository";
import { createPostgresCommentRepository } from "./postgres/comment-repository";
import { createPostgresCourseRepository } from "./postgres/course-repository";
import { createPostgresEscalationRepository } from "./postgres/escalation-repository";
import { createPostgresHierarchyRepository } from "./postgres/hierarchy-repository";
import { createPostgresProfileRepository } from "./postgres/profile-repository";
import { createPostgresReviewRepository } from "./postgres/review-repository";
import { isPostgresProvider } from "./provider";

let courseRepository: CourseRepository | null = null;
let profileRepository: ProfileRepository | null = null;
let reviewRepository: ReviewRepository | null = null;
let commentRepository: CommentRepository | null = null;
let hierarchyRepository: HierarchyRepository | null = null;
let escalationRepository: EscalationRepository | null = null;

export function getCourseRepository(): CourseRepository {
  courseRepository ??= isPostgresProvider()
    ? createPostgresCourseRepository()
    : createSupabaseCourseRepository();
  return courseRepository;
}

export function getProfileRepository(): ProfileRepository {
  profileRepository ??= isPostgresProvider()
    ? createPostgresProfileRepository()
    : createSupabaseProfileRepository();
  return profileRepository;
}

export function getReviewRepository(): ReviewRepository {
  reviewRepository ??= isPostgresProvider()
    ? createPostgresReviewRepository()
    : createSupabaseReviewRepository();
  return reviewRepository;
}

export function getCommentRepository(): CommentRepository {
  commentRepository ??= isPostgresProvider()
    ? createPostgresCommentRepository()
    : createSupabaseCommentRepository();
  return commentRepository;
}

export function getHierarchyRepository(): HierarchyRepository {
  hierarchyRepository ??= isPostgresProvider()
    ? createPostgresHierarchyRepository()
    : createSupabaseHierarchyRepository();
  return hierarchyRepository;
}

export function getEscalationRepository(): EscalationRepository {
  escalationRepository ??= isPostgresProvider()
    ? createPostgresEscalationRepository()
    : createSupabaseEscalationRepository();
  return escalationRepository;
}
