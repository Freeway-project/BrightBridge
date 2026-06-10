# CourseBridge RBAC & Hierarchy Architecture

**Status:** Draft / Active Implementation
**Philosophy:** Application-Layer Security (PBAC) over Database-Layer Security (Supabase RLS).

This document outlines the 3-Layer Access Control Model for BrightBridge. It replaces the legacy flat role string (`"admin"`, `"ta"`) with a robust hierarchy designed for university environments.

## The 3-Layer Access Model

### Layer 1: Global System Roles (What you can DO)
System-wide privileges, independent of what department a user belongs to. Stored in `profiles.role`.

*   `super_admin`: Full system configuration and global user management.
*   `admin_full`: Standard admin capability. Can assign staff, approve reviews globally, and trigger workflow transitions.
*   `admin_viewer`: Read-only global access. Can see all dashboards and progress, but cannot mutate state. (This replaces the legacy `communications` role).
*   `standard_user`: Catch-all for Staff, Instructors, Dept Heads, and Deans. Their access is determined entirely by Layer 2 and Layer 3.

### Layer 2: Organizational Hierarchy (What you can SEE)
Implicit read/view access based on the university's structure.

**Schema Additions (Adjacency List):**
*   `organizational_units`: Represents the hierarchy (`id`, `parent_id`, `name`, `type`). Example: *College of Science -> Math Department*.
*   `org_unit_members`: Connects a profile to a unit with a title (`profile_id`, `org_unit_id`, `title`). Example: *Alice is 'dean' of College of Science*.
*   `courses.org_unit_id`: Replaces the raw `department` text string.

**Policy Rule:** A user has implicit *view-only* access to a course if the course belongs to an `org_unit` that is equal to, or a descendant of, an `org_unit` the user is a member of.

### Layer 3: Case Team Assignments (What you actively WORK ON)
Explicit responsibility for a specific course review case. Stored in `course_assignments`.

*   `staff` (formerly `ta`): The active worker. Explicitly assigned to fill out and edit the review form for a specific course.
*   `instructor`: The owner/client. Explicitly assigned to review the final report, ask questions, and approve a specific course.

**Policy Rule:** Even if a user has Layer 2 hierarchy access (e.g. a Dean), they cannot *edit* a review form or *approve* a course unless they are explicitly assigned to that course in Layer 3.

## Implementation Strategy: PBAC (Policy-Based Access Control)

Because we are moving away from Supabase Row Level Security (RLS), all security checks must happen in the Next.js backend (`packages/authorization` or within `packages/workflow`) *before* executing a database query.

**Example Next.js Backend Policy Check:**
```typescript
export async function canEditReviewForm(userId: string, courseId: string, db: DatabaseClient) {
  // Only the explicitly assigned Staff (Case Team) can edit the form
  const assignment = await db.getCourseAssignment(userId, courseId);
  return assignment?.role === 'staff';
}
```

**Data Fetching Rule (Repositories):**
When fetching lists of courses for a user, the repository must build a query that unions courses they are explicitly assigned to (Layer 3) with courses in their organizational hierarchy (Layer 2), unless they are an `admin_full` or `admin_viewer` (Layer 1).
