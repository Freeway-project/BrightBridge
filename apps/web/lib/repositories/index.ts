import "server-only";

import type {
  CommentRepository,
  CourseRepository,
  EscalationRepository,
  HierarchyRepository,
  ProfileRepository,
  ReviewRepository,
} from "@/lib/repositories/contracts";
import { createPostgresCommentRepository } from "./postgres/comment-repository";
import { createPostgresCourseRepository } from "./postgres/course-repository";
import { createPostgresEscalationRepository } from "./postgres/escalation-repository";
import { createPostgresHierarchyRepository } from "./postgres/hierarchy-repository";
import { createPostgresProfileRepository } from "./postgres/profile-repository";
import { createPostgresReviewRepository } from "./postgres/review-repository";

let courseRepository: CourseRepository | null = null;
let profileRepository: ProfileRepository | null = null;
let reviewRepository: ReviewRepository | null = null;
let commentRepository: CommentRepository | null = null;
let hierarchyRepository: HierarchyRepository | null = null;
let escalationRepository: EscalationRepository | null = null;

export function getCourseRepository(): CourseRepository {
  courseRepository ??= createPostgresCourseRepository();
  return courseRepository;
}

export function getProfileRepository(): ProfileRepository {
  profileRepository ??= createPostgresProfileRepository();
  return profileRepository;
}

export function getReviewRepository(): ReviewRepository {
  reviewRepository ??= createPostgresReviewRepository();
  return reviewRepository;
}

export function getCommentRepository(): CommentRepository {
  commentRepository ??= createPostgresCommentRepository();
  return commentRepository;
}

export function getHierarchyRepository(): HierarchyRepository {
  hierarchyRepository ??= createPostgresHierarchyRepository();
  return hierarchyRepository;
}

export function getEscalationRepository(): EscalationRepository {
  escalationRepository ??= createPostgresEscalationRepository();
  return escalationRepository;
}
