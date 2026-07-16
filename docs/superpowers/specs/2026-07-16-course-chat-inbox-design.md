# Course-Chat Inbox — Design Spec

**Date:** 2026-07-16
**Branch:** `ft-course-chat-inbox`
**Status:** Approved design, pending implementation plan

## Problem

Course "Chat with Instructor" Q&A threads (the `course_comments` timeline) today live **only inside each individual course page**. There is no central place to see which courses have chat activity, so users must open courses one by one to find conversations that need attention. This is the pain: *"it's difficult to find all the courses that got to chat."*

Note: the app has two unrelated "chat" systems. This spec concerns **System B only** — the per-course `course_comments` Q&A threads. It does **not** touch **System A**, the real-time messenger at `/chat` (`conversations`/`messages`), except to add a new tab in its shell.

## Goal

Add a **"Courses" tab inside the `/chat` hub** that acts as a central inbox of per-course Q&A threads. Each row shows a course with chat activity; clicking it opens that course's thread **inline in the hub content pane** to read and reply, with an "Open course" link back to the full course page.

## Decisions (settled during brainstorming)

| Question | Decision |
|---|---|
| Primary user | **Any chat participant**, scoped to courses they can access |
| Which "chat" | **System B** — per-course `course_comments` Q&A threads |
| Attention model | **Unanswered-question count + recency** (no new tables / no per-user read state) |
| Placement | **Tab inside the `/chat` hub**, plus surfaced in the TA (`standard_user`) dashboard chat tab |
| Row click | **Read & reply inline** in the hub content pane, with an "Open course" link |
| Render strategy | **Approach C** — extract a shared, context-free `<CourseCommentThread>` used by both the course page and the hub |

## Architecture (MVC)

Nothing about the messenger changes. We add a parallel view backed by `course_comments`.

- **Model** — one new aggregation query `listCourseChatInbox(scope)` over `course_comments` joined to accessible courses (in `apps/web/lib/repositories/postgres/comment-repository.ts`), wrapped by a service function in `apps/web/lib/services/comments.ts`.
- **Controller** — reuse existing server actions unchanged (`postSharedCommentAction`, `markAnsweredAction` in `apps/web/lib/actions/shared-comment-actions.ts`); add one thin read action for the inbox list.
- **View** — (a) a `Messages | Courses` tab switch in the hub `Sidebar` (`apps/web/app/(dashboard)/chat/_components/Sidebar.tsx`); (b) a `<CourseCommentThread>` extracted from the existing per-course thread UI, rendered in both the course page and the hub content pane.

## Model — inbox query

`listCourseChatInbox(scope: AccessibleCourseScope)` returns, **per course that has ≥1 comment**:

```
{ courseId, courseTitle, lastActivityAt, lastPreview, lastAuthorName, unansweredCount }
```

- `unansweredCount = count(*) where is_question AND NOT is_answered`
- `lastActivityAt = max(created_at)`, `lastPreview` / `lastAuthorName` from the most-recent comment
- Sorted `lastActivityAt DESC`
- Courses with no comments are excluded

`scope` reuses the same `AccessibleCourseScope` the `/courses` list uses (`{kind:'all'}` for admins; `{kind:'assigned', profileId, role}` otherwise), so per-role visibility is automatically correct and consistent with the rest of the app.

## Routing & navigation

- The Courses **list** renders in the hub sidebar (client-side tab state `Messages` / `Courses`); the list data is server-fetched via the new read action.
- The inline **thread** gets a **static** route segment so it never collides with the existing dynamic `/chat/[conversationId]`:
  - `/chat/course/[courseId]` → renders `<CourseCommentThread courseId>` in the content pane.
  - (Static segments take precedence over dynamic siblings in the App Router, so `course` wins over `[conversationId]`.)
- **TA coverage:** the same list + thread render inside `apps/web/app/(dashboard)/ta/_components/ta-chat-tab.tsx`, because `standard_user` has no `/chat` nav item.

## View — components

- **`Sidebar`** gains a two-item tab header. **Courses** renders `<CourseChatList>` — one row per course, showing `{ course title, who last messaged (last author), preview snippet, last-activity time, unanswered badge }`, sorted by recency. Surfacing the **author + preview** directly on the row is a core requirement: with many courses, the user needs to see *who* messaged and *what* about at a glance, without opening each course.
- **`<CourseCommentThread courseId>`** — the context-free shared unit (Approach C). Renders the `course_comments` timeline + composer + mark-answered, and — **for roles that have an accessible course-detail page** — an **"Open course"** link:
  - instructor → `/instructor/courses/[id]`, standard_user → `/courses/[id]`, admin_full / super_admin → `/admin/courses/[id]`.
  - `admin_viewer` and `provost` have **no** course-detail page they can open (the admin page is gated to admin_full/super_admin; `/courses/[id]` is assignment-scoped and those roles aren't assigned), so `courseHrefForRole` returns `null` and the "Open course" link is **hidden** for them. They still read the thread inline (they're read-only — no post/answer).
- **No course-page refactor was needed:** `course-chat-panel.tsx` (`CourseChatPanel`) is already the shared thread used by the existing course pages, so `<CourseCommentThread>` reuses it directly. (`course-conversation.tsx` is a separate escalation/internal-log feature and is left untouched.)

## Data flow

1. User opens `/chat`, switches to the **Courses** tab → the read action fetches `listCourseChatInbox(scope)`.
2. User clicks a course → navigate to `/chat/course/[courseId]` → server-loads that course's shared comments (`getSharedComments`) → `<CourseCommentThread>` renders.
3. Reply / mark-answered → existing actions (`postSharedCommentAction` / `markAnsweredAction`) → existing `broadcastCourseCommentEvent(courseId)` (topic `course-comments-{courseId}`) → `use-course-comment-realtime` refreshes the open thread.
4. The inbox list re-fetches on focus / `router.refresh()`. There is **no per-user unread**, so there is no mark-read write.

## Permissions (PBAC)

- **List:** scoped by `AccessibleCourseScope` — a user sees only courses they can access.
- **Open a thread:** guard `/chat/course/[courseId]` by verifying the course is in the caller's accessible set (reuse the course-access check the existing course pages already apply) → redirect on failure.
- **Post / answer:** unchanged existing guards in `shared-comment-actions.ts` (role allow-lists + delegation via `resolveDelegationContext`).

## Error / empty / loading states

- Empty inbox → "No course chats yet" placeholder in the Courses tab.
- Thread load failure / no access → redirect or inline error, matching existing hub patterns.
- List fetch error → non-blocking error row; the Messages tab remains fully functional.

## Testing

- **Unit** — `listCourseChatInbox`: scoping (all vs. assigned), unanswered count, recency sort, empty result, exclusion of comment-less courses.
- **Permission** — a non-member cannot open a course thread via `/chat/course/[id]` (redirected).
- **Component** — `<CourseChatList>` renders/sorts/badges correctly; `<CourseCommentThread>` posts a reply and reflects mark-answered.
- **Regression** — existing course pages still render the extracted `<CourseCommentThread>` correctly after refactor.

## Out of scope (YAGNI)

- Per-user unread tracking (a `last_read_at` per user per course).
- Unifying with the messenger (System A).
- Editing / deleting comments from the hub.
- Nav badge / notifications for course-chat activity.

## Plan-time investigations (for writing-plans)

- Confirm how tightly `course-conversation.tsx` / `course-chat-panel.tsx` are coupled to course-page context (props, refresh wrappers) to size the `<CourseCommentThread>` extraction. If the extraction is messy, fall back to **Approach B** (a hub-native thread component calling the same services/actions).
- Confirm the exact `AccessibleCourseScope` construction and the course-access guard used by the existing course pages, to reuse them verbatim.
- Confirm the `course_comments` column set and the most-recent-comment query shape for `lastPreview` / `lastAuthorName`.
