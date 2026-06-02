# Workflow Transitions

CourseBridge uses workflow transitions to control how a course moves from one status to another.

The transition rules live in `packages/workflow`.

## What A Transition Means

A transition answers this question:

```text
Can this role move this course from status A to status B?
```

Example:

```ts
{
  from: "submitted_to_admin",
  to: "ready_for_instructor",
  roles: ["admin", "super_admin"]
}
```

This means:

```text
If a course is currently submitted_to_admin,
only admin or super_admin can move it to ready_for_instructor.
```

## Current Main Flow

```text
course_created
→ assigned_to_ta
→ ta_review_in_progress
→ submitted_to_admin
→ ready_for_instructor
→ sent_to_instructor
→ instructor_approved
→ final_approved
```

## Admin Fix Branch

```text
submitted_to_admin
→ admin_changes_requested
→ ta_review_in_progress
→ submitted_to_admin
```

## Instructor Question Branch

```text
sent_to_instructor
→ instructor_questions
→ sent_to_instructor
```

## Helper Functions

### `canTransition`

Answers whether a transition is allowed.

```ts
canTransition({
  role: "admin",
  from: "submitted_to_admin",
  to: "ready_for_instructor"
});
```

Returns `true`.

```ts
canTransition({
  role: "ta",
  from: "submitted_to_admin",
  to: "ready_for_instructor"
});
```

Returns `false`.

### `getAllowedTransitions`

Returns the next statuses a role can move a course to from the current status.

```ts
getAllowedTransitions({
  role: "admin",
  from: "submitted_to_admin"
});
```

Returns:

```ts
["admin_changes_requested", "ready_for_instructor"]
```

### `assertCanTransition`

Throws an error if the role is not allowed to make the transition.

This will be useful inside server actions before updating the database.

## How This Fits With The Database

The workflow package does not save anything to the database.

It is the rulebook.

Later, when a user clicks a workflow action button, the app should:

1. Load the current course status.
2. Load the current user role.
3. Ask `packages/workflow` if the transition is allowed.
4. If allowed, update the course status in Supabase.
5. Create a status event record for audit/history.

The intended pattern is:

```text
UI button asks workflow package first.
If allowed, update database.
If not allowed, block action.
```

This prevents random direct status updates from different screens.
