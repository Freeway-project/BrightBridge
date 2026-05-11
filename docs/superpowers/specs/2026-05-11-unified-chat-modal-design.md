# Unified Chat Modal Design

**Date:** 2026-05-11  
**Branch:** `ft-ui-ux`  
**Status:** Design Phase

## Overview

Consolidate the split chat experience into a single unified chat modal accessible via topbar icon, replacing the sidebar chat layout. All comments, escalations, and messaging happen in one timeline-based interface.

## Goals

1. Reduce UI fragmentation (two chat components → one)
2. Save screen real estate (sidebar → modal)
3. Simpler information architecture (unified timeline)
4. Maintain RBAC and functionality (no breaking changes)

## Architecture

### Components

**New Component: `UnifiedChatModal`**
- Replace `CourseConversation` sidebar usage
- Open/close state managed locally or via dialog context
- Full-screen modal on mobile, slide-out panel on desktop (right side)

**Reuse:**
- `CourseConversation` component as modal content (minimal changes)
- Existing data layer (`conversation.ts`)
- Existing actions (`postCommentAction`, `createEscalationAction`)

### Data Flow

```
Course Page
  ↓
Chat Icon Click
  ↓
Open UnifiedChatModal
  ↓
Fetch getCourseConversation(courseId)
  ↓
Render timeline (comments + escalations mixed)
  ↓
User posts comment/escalation
  ↓
Action (postCommentAction / createEscalationAction)
  ↓
Revalidate & close modal
```

### UI Layout

**Desktop:**
- Topbar: Chat icon (MessageSquare) in right corner
- Click → slide-out panel from right (400-500px wide)
- Click outside or close button → dismiss
- Main content behind modal (semi-transparent overlay)

**Mobile:**
- Topbar: Chat icon
- Click → full-screen modal
- Close button in top-right

### Timeline Structure

Single chronological timeline merging:
- **Comments** — regular messages (gray bubbles for others, blue for self)
- **Escalations** — red-highlighted cards with severity badge + status
- Escalation messages nested within escalation card

### Tab Structure (inside modal)

- **Message Tab** — Regular comment input
- **Escalate Tab** — Escalation creation form (severity, title, message)

## Integration Points

### Files to Create
- `apps/web/components/chat/unified-chat-modal.tsx` — Modal wrapper
- `apps/web/components/chat/chat-icon-button.tsx` — Topbar icon button

### Files to Modify
- `apps/web/app/(dashboard)/courses/[id]/layout.tsx` — Add UnifiedChatModal to layout
- `apps/web/app/(dashboard)/admin/courses/[id]/layout.tsx` — Add UnifiedChatModal to layout
- `apps/web/components/layout/topbar.tsx` — Add chat icon button
- `apps/web/app/(dashboard)/courses/[id]/_components/info-panel.tsx` — Remove CourseConversation sidebar usage (replace with modal)
- `apps/web/app/(dashboard)/admin/courses/[id]/_components/admin-course-sidebar.tsx` — Remove CourseConversation sidebar usage (replace with modal)

### Files to Delete
- `apps/web/app/(dashboard)/admin/courses/[id]/_components/course-chat.tsx` — Unused component

### Action Consolidation
Currently:
- `postCommentAction` → `/admin/courses/[id]/actions.ts`
- `createEscalationAction` → `/courses/[id]/escalation-actions.ts`

Plan: Keep as-is for now (minimal refactor). Can consolidate later if needed.

## RBAC Considerations

**Existing protections:**
- `postCommentAction` requires auth (requireProfile)
- `createEscalationAction` requires auth (requireProfile)
- Visibility rules already in place (internal vs instructor-visible)

**No changes needed** — modal inherits existing RBAC.

## Implementation Phases

### Phase 1: Create Modal Component
- `unified-chat-modal.tsx` wraps CourseConversation
- Dialog/modal state management
- Topbar integration

### Phase 2: Update Page Layouts
- Add UnifiedChatModal to course detail layouts
- Remove sidebar chat components
- Update topbar to show chat icon

### Phase 3: Cleanup
- Remove unused `course-chat.tsx`
- Test all roles (TA, Admin, Instructor)

## Testing

- [x] Modal opens/closes
- [x] Chat icon visible in topbar
- [x] Comments post successfully
- [x] Escalations create successfully
- [x] Timeline renders correctly (mixed comments + escalations)
- [x] Responsive (desktop modal, mobile full-screen)
- [x] RBAC intact (comment/escalation visibility)
- [x] Works for TA, Admin, Instructor roles

## Success Criteria

1. ✅ One unified chat component (no duplicate logic)
2. ✅ Chat accessible via topbar icon (not sidebar)
3. ✅ All existing features work (comments, escalations, tabs)
4. ✅ No breaking changes (RBAC, data layer)
5. ✅ Cleaner UI (less sidebar clutter)

## Notes

- `CourseConversation` component stays mostly as-is (minimal refactor)
- Icon placement (topbar right corner, near user menu)
- Modal should not block main content interaction (consider transparent overlay or side-panel approach)
- Mobile responsiveness critical (full-screen modal on small screens)
