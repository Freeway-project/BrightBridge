# Handoff: Brightspace Migration Review Platform

> **For developers using Claude Code.**
> The HTML files in this bundle are **low-fidelity wireframes** — design references showing structure, layout, workflow and data. Your task is to recreate these screens in a real Next.js + shadcn/ui codebase. Do not ship the HTML directly. Apply your project's design system for final styling.

---

## Overview

A multi-role internal web application for tracking, reviewing, and approving the migration of college courses from Moodle to Brightspace. Five roles interact with the system in a defined workflow. The app manages course records through 10 canonical statuses from `course_created` → `final_approved`.

**Tech target:** React (Next.js recommended) · shadcn/ui components · TailwindCSS · TypeScript

---

## Fidelity

**Low-fidelity wireframes.** Layout, data structure, role logic, status transitions, and button actions are fully specified. Visual polish (colors, spacing, typography) should follow your shadcn/ui theme. The wireframes use a dark sidebar + light content area shell — keep that structural pattern.

---

## Roles

| Role | Key | Dashboard Entry Point |
|------|-----|-----------------------|
| Teaching Assistant | `ta` | My Courses |
| Admin Reviewer | `admin` | Review Queue |
| Communication Dept | `communications` | Handoff Queue |
| Instructor | `instructor` | My Course Reviews |
| Super Admin | `super_admin` | System Overview |

**Role routing:** After login, redirect each role to their dashboard automatically. Instructors only see courses where `isInstructorVisibleStatus = true` (see status table below).

---

## Canonical Status System

All course records move through these statuses in order:

| Status Key | Display Label | Color | Visible to Instructor |
|------------|---------------|-------|-----------------------|
| `course_created` | Course Created | gray | ✗ |
| `assigned_to_ta` | Assigned to TA | gray | ✗ |
| `ta_review_in_progress` | TA Review In Progress | blue | ✗ |
| `submitted_to_admin` | Submitted to Admin | yellow | ✗ |
| `admin_changes_requested` | Changes Requested | orange | ✗ |
| `ready_for_instructor` | Ready for Instructor | purple | ✗ |
| `sent_to_instructor` | Sent to Instructor | purple | ✓ |
| `instructor_questions` | Instructor Questions | orange | ✓ |
| `instructor_approved` | Instructor Approved | green | ✓ |
| `final_approved` | Final Approved | green | ✓ |

### Status Transitions & Role Gates

```
course_created
  └─[admin, super_admin]──────────────► assigned_to_ta
       └─[ta, super_admin]─────────────► ta_review_in_progress
            └─[ta, super_admin]──────────► submitted_to_admin
                 ├─[admin, super_admin]────► admin_changes_requested
                 │    └─[ta, super_admin]──► ta_review_in_progress  (loop)
                 └─[admin, super_admin]────► ready_for_instructor
                      └─[communications, admin, super_admin]─► sent_to_instructor
                           ├─[instructor, super_admin]──────► instructor_questions
                           │    └─[communications, admin, super_admin]─► sent_to_instructor (loop)
                           └─[instructor, super_admin]──────► instructor_approved
                                └─[admin, super_admin]───────► final_approved
```

### ⚠️ Open Questions (confirm before building)
1. **No instructor rejection path** — instructor can only approve or ask questions. Intentional?
2. **Admin can bypass Comm Dept** — `ready_for_instructor → sent_to_instructor` is allowed for `admin`. Intentional fallback?
3. **`course_created` flow** — does the app need a Create Course UI, or is this handled externally (batch import)?
4. **Notification system** — bell icon shown in topbar but panel not designed. Needs spec.
5. **Audit log** — referenced in Super Admin but not designed. Needed?

---

## Screens

### 01 · Login
**File reference:** `Wireframes.html` → artboard "01 · Login / Role Routing"

**Layout:** Centered card, 2 columns (branding left, form right). 700×420px card.

**Fields:**
- Email (text input)
- Password (password input)
- Role (select dropdown — maps to role keys above)
- Submit button → redirects to role dashboard

**Notes:**
- SSO via institutional identity provider should be supported
- Role is selected at login (no auto-detect from email domain needed per spec)

**shadcn components:** `Card`, `Input`, `Select`, `Button`

---

### 02 · TA Dashboard — My Courses
**File reference:** `Wireframes.html` → artboard "02 · TA Dashboard"

**Layout:** Full-height sidebar (196px) + main content area. Top bar (48px) + scrollable content.

**Top bar:** Page title "My Courses" · term subtitle · "+ New Review" button · notification bell

**Stat cards (4-col grid):**
- Assigned (total this term)
- TA In Progress
- Submitted to Admin
- Changes Requested

**Filter bar:** Search input · Term select · Status select · Instructor select

**Course table columns:**
`Course Code` · `Title` · `Term` · `Sec.` · `Status` (SBadge) · `Assigned` (date) · `Time Spent` · `Issues` (count badge) · `Action` (button)

**Action buttons per status:**
- `assigned_to_ta` → "Start Review" (outline)
- `ta_review_in_progress` → "Continue →" (primary)
- `submitted_to_admin` → "View" (ghost)
- `admin_changes_requested` → "Fix Issues →" (destructive)

**shadcn components:** `Table`, `Badge`, `Button`, `Input`, `Select`, `Card`

---

### 03 · Course Workspace — Metadata (Step 1 of 5)
**File reference:** `Wireframes.html` → artboard "03 · Course Workspace — Metadata"

**Layout:** Sidebar (196px) + topbar + 3-column body:
- Left: Step navigator (172px) + Review Timer
- Center: Form (flex-1)
- Right: Info panel (210px)

**Step navigator (left):** 5 steps — Metadata · Review Matrix · Syllabus & GB · Issue Log · Submit. Show done/active/pending state. Review Timer below steps (HH:MM:SS, running per session, Pause button).

**Form fields (2-col grid):**
- Course Code *(auto-filled, read-only)*
- Course Title *(auto-filled)*
- Term (select)
- Section(s) (multi-chip input)
- Brightspace Course URL *(required)*
- Moodle Course URL (archive link)
- Reviewer *(auto-filled — current user)*
- Review Date *(auto-filled — today)*
- Migration Notes Summary (textarea, required)
- Time Required *(auto-calculated from timer)*

**Right info panel:** Status badge · People (TA / Instructor / Admin) · Progress per step · Last saved

**shadcn components:** `Input`, `Select`, `Textarea`, `Button`, `Badge`, `Progress`, `Separator`

---

### 04 · Course Workspace — Review Matrix (Step 2 of 5)
**File reference:** `Wireframes.html` → artboard "04 · Course Workspace — Review Matrix"

**Layout:** Same 3-column shell. Timer stays left.

**Matrix table columns:** `Check Item` · `Status` (select) · `Notes / Findings` · `Direct Link` · `Action`

**Status dropdown options:** Pass · Fix Needed · Missing · Escalate · N/A

**Rules:**
- When status = `Fix Needed`, `Missing`, or `Escalate`: Notes field becomes **required** (highlight border orange)
- When status = `Fix Needed`, `Missing`, or `Escalate`: Show "+ Issue" button (destructive) → opens Issue Log prefilled with this row
- Rows with problems highlighted with amber left-border + light orange bg

**Sections:** Collapsible — A. Course Shell & Navigation · B. Pages & Files · C. Links & Embedded Content (configurable by Super Admin)

**Right panel:** Live count of Pass / Fix Needed / Missing / N/A · Issues created count

**shadcn components:** `Select`, `Input`, `Button`, `Badge`, `Collapsible`, `Table`

---

### 05 · Course Workspace — Syllabus & Gradebook (Step 3 of 5)
**File reference:** `Wireframes.html` → artboard "05 · Course Workspace — Syllabus & Gradebook"

**Layout:** Same 3-column shell. Timer stays left.

**Syllabus section — Dual Confirmation:**
- TA confirms via dropdown: `TA Confirmed` / `Pending TA Review` / `Fix Needed`
- Admin confirmation column: read-only for TA (shows "Pending Admin" until Admin confirms in their screen)
- Both confirmations required before course can progress
- Notes field + direct link field per row

**Instructor & Contact:**
- Instructor select (from course roster)
- Instructor email (auto-filled)
- Communication contact (optional select)

**Gradebook section — table:**
Same Check Item / Status / Notes / Link columns as Review Matrix.
Items: Weighted categories · Assignments · Quizzes · Forums · Calculations · Final grade

**shadcn components:** `Select`, `Input`, `Textarea`, `Badge`, `Table`, `Separator`

---

### 06 · Course Workspace — Issue Log (Step 4 of 5)
**File reference:** `Wireframes.html` → artboard "06 · Issue Log + Side Drawer"

**Layout:** Same shell. Steps on left (no timer — timer only on active review steps). Main table + right side drawer when row selected.

**Issue table columns:** `ID` · `Type` · `Location` · `Severity` (Major/Minor/Critical) · `Owner` · `Status` (Open/Fixed/Escalated/Resolved) · `Created By` · `Date`

**Filter bar:** Search · Status filter · Severity filter · Owner filter

**Side drawer (Sheet — right side, 340px):**
- Issue title + ID
- Severity badge + Status badge + Owner badge
- Description (editable)
- Location link (direct link to BS item)
- Status history timeline
- Comments thread (avatar + name + timestamp + text)
- Add comment textarea
- Attachment dropzone
- Status change select + "Mark Fixed" button

**shadcn components:** `Sheet`, `Table`, `Badge`, `Select`, `Textarea`, `Button`, `Input`, `Separator`

---

### 07 · Admin Dashboard — Review Queue
**File reference:** `Wireframes.html` → artboard "07 · Admin Dashboard — Review Queue"

**Layout:** Same shell structure. Admin sidebar.

**Stat cards (4-col):** Pending Review · Changes Requested (returned) · Approved This Week · Major Issues

**Table columns:** `Course` · `TA Reviewer` · `Submitted` · `Review Time` · `Issues` · `Syllabus (TA)` · `Syllabus (Admin)` · `Status` · `Actions`

**Action buttons per status:**
- `submitted_to_admin` → "Review" (primary) + "✓ Approve" (success) + "↩ Fix" (destructive)
  - Approve → sets `ready_for_instructor`
  - Fix → sets `admin_changes_requested`
- `ready_for_instructor` → "Review" + "Send to Comm →" (purple outline)
- `admin_changes_requested` → "Review" + "Pending TA Fix" (disabled/gray)

**shadcn components:** `Table`, `Badge`, `Button`, `Card`, `Input`, `Select`

---

### 08 · Admin Review Screen
**File reference:** `Wireframes.html` → artboard "08 · Admin Review Screen — Thread Tab"

**Layout:** Same shell. Tabs along top. Right info panel (230px).

**Tabs:** Metadata · Review Matrix · Syllabus & GB · Issues (count) · Thread · History

**Thread tab (main content):**
- Chronological message list. Each message: avatar circle (initials + role color) · sender name · role badge · timestamp · message bubble
- @mention support (tag any participant)
- Reply textarea + attach button + link-to-issue button + Post button

**Right panel:**
- Course summary (TA, submitted date, review time, instructor)
- Issue summary (Major / Minor counts)
- Checklist summary (Pass / Fix Needed / N/A counts)
- Syllabus status (TA confirmed? Admin confirmed?)
- **Action buttons:** ✓ Approve → `ready_for_instructor` · ↩ Return to TA → `admin_changes_requested` · Escalate Issue

**Topbar actions:** "Return to TA" (destructive) · "✓ Approve → ready_for_instructor" (success) — NO "Send to Comm Dept" button here (that lives in Admin Dashboard table)

**shadcn components:** `Tabs`, `Sheet`, `Textarea`, `Button`, `Badge`, `Avatar`, `Separator`, `Card`

---

### 09 · Communication Dept — Handoff Queue
**File reference:** `Wireframes.html` → artboard "09 · Communication Dept — Handoff Queue"

**Layout:** Same shell. Comm Dept sidebar.

**Stat cards (5-col):** Ready to Send · Sent · Questions Pending · Instructor Approved · Total Handled

**Table columns:** `Course` · `Instructor` · `Admin Approved` (date) · `Comm. Status` (SBadge) · `Open Issues` · `Instructor Qs` · `Last Activity` · `Actions`

**Action buttons per status:**
- `ready_for_instructor` → "📤 Send to Instructor" → sets `sent_to_instructor`
- `sent_to_instructor` → "View Thread"
- `instructor_questions` → "Resolve Q →" (destructive) → after resolving, sets back to `sent_to_instructor`. **Only communications/admin/super_admin can trigger this.**
- `instructor_approved` → "Forward to Admin →"

**Thread preview panel** (bottom of page, ~200px): Recent activity list + active thread view for selected course + reply input.

**shadcn components:** `Table`, `Badge`, `Button`, `Card`, `Textarea`, `Input`, `Separator`, `ScrollArea`

---

### 10 · Instructor Dashboard — My Course Reviews
**File reference:** `Wireframes.html` → artboard "10 · Instructor Dashboard"

**Layout:** Same shell. Instructor sidebar.

**Only show courses where `isInstructorVisibleStatus = true`** (i.e., `sent_to_instructor`, `instructor_questions`, `instructor_approved`, `final_approved`). Courses in earlier statuses are NOT shown.

**Stat cards (3-col):** Awaiting Your Approval · Questions You've Asked · Fully Approved

**Course cards (vertical list):** Each card shows:
- Course code + title + status badge
- Stage progress indicator: TA Review → Admin Review → Comm Dept → Your Approval
- Summary panel (Course Info / Migration Notes / Checklist / Gradebook / Final Approval) — only when `sent_to_instructor` or `instructor_questions`
- Action bar: "Ask Question" · "Request Revision" · spacer · "✓ Approve Course" (success)

**Action gates:**
- `sent_to_instructor` → can ask question (→ `instructor_questions`) or approve (→ `instructor_approved`)
- `instructor_questions` → view thread only; cannot self-resolve
- `instructor_approved` → read-only
- `final_approved` → "View Final Report" (ghost)

**Thread snippet** at bottom for most recent active thread.

**shadcn components:** `Card`, `Badge`, `Button`, `Progress`, `Separator`, `Textarea`, `Avatar`, `ScrollArea`

---

### 11 · Super Admin — System Overview
**File reference:** `Wireframes.html` → artboard "11 · Super Admin — System Overview"

**Layout:** Same shell. Admin sidebar.

**Top stats (5-col):** Total Courses · TA In Progress · Pending Admin · With Instructor · Completed

**Charts / breakdowns (2-col grid):**
- Courses by status (bar chart with progress bars per status key)
- Most common issue types (ranked list with count chips)

**Tables (2-col grid):**
- TA Review Times: TA name · Courses assigned · Avg time · Avg issues
- Courses Stuck Longest: Course code · Current status · Days stuck (highlight red if >5d)

**Quick Actions row:**
`Manage Users & Roles` · `Create Course Batch` · `Configure Checklist Templates` · `Configure Dropdown Values` · `View Audit Logs` · `Export All Data`

**shadcn components:** `Card`, `Table`, `Badge`, `Button`, `Progress`, `Separator`

---

## Review Matrix Checklist — Default Sections

These are configurable by Super Admin. Default template:

**A. Course Shell & Navigation**
- Homepage loads correctly
- Modules present and logically ordered
- No duplicate or empty modules
- Homepage tools function accordingly

**B. Pages & Files**
- Pages render correctly
- Files open correctly
- No Moodle references remain
- Images display properly

**C. Links & Embedded Content**
- Internal links functional
- External links functional
- Embedded media loads

**D. Syllabus** *(handled separately in Syllabus & GB form)*

**E. Gradebook** *(handled separately in Syllabus & GB form)*

---

## Issue Severity Levels

| Level | Color | Description |
|-------|-------|-------------|
| Critical | red | Blocks course use entirely |
| Major | red | Significant content missing or broken |
| Minor | orange | Small fix needed, course still usable |

## Issue Status Values

| Status | Meaning |
|--------|---------|
| Open | Logged, not yet addressed |
| Fixed | Resolved by TA/Admin |
| Escalated | Sent to IT or external party |
| Resolved | Closed/verified |

---

## Timer Behavior

- Timer runs per review session (not per course total — sessions accumulate)
- Displayed on left step nav for all TA workspace steps (Metadata, Review Matrix, Syllabus & GB, Issue Log)
- TA can pause/resume
- Total time auto-populates the Metadata "Time Required" field
- Time is shown in Admin Review for reference

---

## Notification Triggers (not yet designed — implement as toast + bell badge)

| Trigger | Notified |
|---------|----------|
| Course assigned to TA | TA |
| TA submits for review | Admin |
| Admin requests changes | TA |
| Admin approves → ready_for_instructor | Comm Dept |
| Comm Dept sends to instructor | Instructor |
| Instructor asks question | Comm Dept + Admin |
| Question resolved | Instructor |
| Instructor approves | Admin |
| Final approved | TA + Instructor |

---

## Design Tokens (shadcn/Tailwind equivalents)

| Token | Value | Tailwind |
|-------|-------|---------|
| Sidebar bg | `#1c1c2e` | custom |
| Sidebar text | `#9090b8` | custom |
| Accent / primary | `#4870ff` | `blue-500` range |
| Border | `#e4e4ee` | `border` |
| Surface | `#f7f7fc` | `muted` |
| Destructive | `#b91c1c` | `destructive` |
| Success | `#15803d` | `green-700` |

Status badge colors map to Tailwind semantic tokens — use `Badge` variant props.

---

## Files in this Package

| File | Purpose |
|------|---------|
| `Wireframes.html` | All 11 screens as interactive wireframes. Open in browser. Click artboard labels to focus fullscreen. Use ← → to step through. Tweaks panel (toolbar) lets you swap font/theme. |
| `README.md` | This document — full dev spec |

---

## Getting Started (Claude Code prompt suggestion)

```
I have a design handoff package for a Brightspace course migration review platform.
Read README.md for the full spec, then open Wireframes.html in a browser to see all 11 screens.
Build this as a Next.js 14 app with shadcn/ui, Tailwind, and TypeScript.
Start with the routing structure, status system, and TA Dashboard.
```
