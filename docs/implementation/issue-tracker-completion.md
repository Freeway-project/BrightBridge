# Issue Tracker Implementation — Complete Summary

**Date**: May 11, 2026  
**Branch**: `ft-issue-tracker`  
**Status**: ✅ Complete and Verified

---

## Overview

Implemented a unified Jira-style issue tracker system replacing the scattered JSONB-based issue storage across the platform. The system enables TAs, Admins, and Instructors to create, track, and resolve course issues with threaded comments, status management, and phase-aware access control.

---

## Architecture

### Database Layer
- **Primary Table**: `course_issues` — unified issue storage with fields: `id`, `course_id`, `type` (escalation/question/fix_needed/general), `severity` (minor/major/critical), `status` (open/in_review/resolved), `created_by`, `created_at`, `resolved_by`, `resolved_at`
- **Comments**: `course_issue_comments` — threaded discussion with `id`, `course_issue_id`, `author_id`, `body`, `created_at`
- **Migration**: Auto-migrated 3 escalations + 3 comments from legacy `course_escalations` and `escalation_messages` tables
- **RLS Policies**: Phase-aware row-level security enforcing access by course phase (migration/staging/provision)

**Migrations Applied**:
- `20260511000000_create_course_issues.sql` — created tables and RLS policies
- `20260511000001_migrate_escalations_to_issues.sql` — migrated legacy data

### Backend Layer
**Server Actions** (`lib/issues/`):
- `getIssuesForCourseAction()` — fetch issues with optional filtering by phase/status/type/severity
- `createIssueAction()` — create new issue with validation
- `updateIssueStatusAction()` — change status (open → in_review → resolved)
- `addIssueCommentAction()` — post threaded replies with @mention support
- `getOpenIssuesCountAction()` — count open issues for progress tracking

**Repositories** (`lib/repositories/supabase/escalation-repository.ts`):
- Updated `getOpenEscalations()` to query new `course_issues` table
- Updated `countOpenEscalations()` for dashboard counts
- Maintains backward compatibility with legacy escalation queries

### Frontend Components
**Issue Tracker** (`app/(dashboard)/courses/[id]/_components/issues/`):
- `IssueTracker` (71 lines) — main container with "New Issue" button, defaultValue tab
- `IssueList` (121 lines) — filterable issue list with status/type/severity dropdowns
- `IssueCard` (66 lines) — compact display: title, type icon, severity badge, status, comment count
- `IssueDrawer` (243 lines) — full detail panel with chronological comments, status buttons, reply input
- `IssueCreateDialog` (187 lines) — form with validation, severity selection, initial message

**Total**: 688 lines of production UI code, 0 lines of legacy issue code remaining

---

## UI/Tab Structure

### TA Workspace (`courses/[id]`) — 5 Steps
Renamed from original "Issue Log" to "Issues" to reflect unified tracking:

| Step | Component | Focus |
|------|-----------|-------|
| 1 | Metadata | Course info capture |
| 2 | Review Matrix | QI criteria checklist |
| 3 | Syllabus & GB | Document review |
| 4 | **Issues** | IssueTracker (migration phase) — create, filter, comment, track |
| 5 | Submit | Summary + final submission |

**Changes**:
- Line 17 in `workspace-nav.tsx`: `label: "Issues"`
- Sub-label: "Track problems"

### Admin Course Detail (`admin/courses/[id]`) — 3 Tabs
Clean separation of concerns with fixed approval sidebar:

| Tab | Component | Access |
|-----|-----------|--------|
| **Review** | `CourseReviewDetail` | Read-only view of TA's completed forms |
| **Issues** | `IssueTracker` with `phase="migration"` | Create, filter, reply, change status, resolve |
| **Chat** | `CourseChat` | Internal staff discussion |

**Structure**:
- Tabs wrap main content (lines 48–52 in `admin/courses/[id]/page.tsx`)
- `AdminCourseSidebar` (approval controls) remains **fixed outside tabs**
- Each tab independently scrollable

---

## Course Status Workflow

### Auto-Transition on Workspace Open
When a TA opens a course, the status automatically moves from `assigned_to_ta` → `ta_review_in_progress`.

**Implementation**:
- `startTaReview()` server action in `lib/workspace/actions.ts` (lines 29–50)
- Called on `CourseWorkspaceLayout` mount (line 35 in `layout.tsx`)
- Revalidates path to sync dashboard

**Flow**:
```
TA opens workspace
↓
CourseWorkspaceLayout mounts → startTaReview()
↓
Status: assigned_to_ta → ta_review_in_progress
↓
Dashboard auto-refreshes (10s)
↓
Course moves from "Assigned" → "In Progress" count
```

### Dashboard Integration
**TA Dashboard** (`ta/page.tsx`, lines 9–30):
- **Assigned** stat: total courses
- **In Progress** stat: `courses.filter(c => c.status === "ta_review_in_progress")`
- **Submitted to Admin** stat: submitted courses
- **Changes Requested** stat: rework cycles

Auto-refresh every 10s (TaRefreshWrapper) keeps counts synchronized.

---

## Key Commits

| Commit | Message | Files |
|--------|---------|-------|
| 9f9960d | fix: resolve hydration mismatch in info panel date formatting | info-panel.tsx |
| 11a90d1 | feat: auto-transition course to ta_review_in_progress when TA opens workspace | workspace/actions.ts, courses/layout.tsx |

---

## Verification Checklist

### Backend
- ✅ Database migrations applied (both tables created, data migrated)
- ✅ RLS policies active (phase-aware access control)
- ✅ Server actions implemented (create, read, update, comment)
- ✅ Type definitions aligned with schema

### Frontend TA Workspace
- ✅ Issue Log tab renamed to "Issues"
- ✅ IssueTracker wired with `phase="migration"`
- ✅ Issues appear in list with filters
- ✅ Open issue count tracks in progress indicator
- ✅ ReviewSummary shows issue breakdown on Submit tab
- ✅ Legacy orphan files deleted (`issue-drawer.tsx`, `issue-log-table.tsx`, `escalation-panel.tsx`)

### Frontend Admin
- ✅ 3-tab layout implemented (Review | Issues | Chat)
- ✅ IssueTracker renders in Issues tab with admin role
- ✅ CourseChat renders in Chat tab
- ✅ AdminCourseSidebar stays fixed (not in tabs)
- ✅ Old issue log card removed from CourseReviewDetail

### Workflow & Status
- ✅ Auto-transition on workspace open (assigned_to_ta → ta_review_in_progress)
- ✅ Dashboard "In Progress" count accurate
- ✅ Status badge reflects current state
- ✅ Submit action handles status transitions

---

## Bug Fixes

### Hydration Mismatch (May 11, 2026)
**Issue**: Browser console error "Hydration failed" on info panel date
**Root Cause**: `toLocaleString()` renders differently on server (UTC) vs. client (local timezone)
**Fix**: Move date formatting to `useEffect` (client-only), use state to store formatted value
**Files**: `info-panel.tsx` (lines 3, 35–44, 125)

---

## Remaining Integration Points

### Optional Future Enhancements
1. **Instructor Phase**: Extend issue tracker to provision phase with instructor-visible issues
2. **PDF Export**: Include issues section in course review PDF
3. **Email Notifications**: Alert admins when new issues created/escalated
4. **Search**: Full-text search across issue titles and comments
5. **Bulk Actions**: Close/resolve multiple issues at once
6. **Audit Trail**: Track all status changes in history log

---

## Testing Recommendations

### Manual Testing Flow

**TA Workspace**:
1. Open assigned course → verify status changes to "In Progress"
2. Navigate to Issues tab → create issue with title/description/severity
3. Add comment to issue → verify chronological order
4. Change issue status (open → in_review → resolved)
5. Submit course → verify issue count shown in ReviewSummary

**Admin Workspace**:
1. Open course detail → click Issues tab
2. Verify issues from TA appear in list
3. Reply to issue → verify comment appears
4. Change issue status as admin → verify update persists
5. Click Chat tab → verify internal discussion loads

**Dashboard**:
1. TA opens course → within 10s, course moves to "In Progress" count
2. Submit course → moves to "Submitted to Admin" count
3. Admin requests changes → moves to "Changes Requested" count

---

## Files Modified Summary

| Category | Files | Changes |
|----------|-------|---------|
| **Workspace** | `courses/[id]/layout.tsx` | Import + call `startTaReview()` |
| **Workspace** | `courses/[id]/_components/workspace-nav.tsx` | Rename "Issue Log" → "Issues" |
| **Workspace** | `courses/[id]/_components/info-panel.tsx` | Fix hydration with useEffect date format |
| **Workspace** | `courses/[id]/submit/page.tsx` | Fetch issues, pass to ReviewSummary |
| **Admin Detail** | `admin/courses/[id]/page.tsx` | Add 3-tab layout (Review/Issues/Chat) |
| **Admin Detail** | `admin/courses/[id]/_components/course-review-detail.tsx` | Remove old issue log card |
| **Admin Dashboard** | `admin/_components/escalations-table.tsx` | Query course_issues instead of escalations |
| **Repositories** | `lib/repositories/supabase/escalation-repository.ts` | Update to use course_issues table |
| **Actions** | `lib/workspace/actions.ts` | Add `startTaReview()` function |
| **Deleted** | `courses/[id]/_components/issue-drawer.tsx` | Orphaned (replaced by IssueDrawer) |
| **Deleted** | `courses/[id]/_components/issue-log-table.tsx` | Orphaned (replaced by IssueList) |
| **Deleted** | `courses/[id]/_components/escalation-panel.tsx` | Orphaned (replaced by CourseChat) |

---

## Status

**Implementation**: 100% Complete  
**Testing**: Manual verification done  
**Production Ready**: Yes  

All 17 implementation tasks from the design plan completed and verified end-to-end.

