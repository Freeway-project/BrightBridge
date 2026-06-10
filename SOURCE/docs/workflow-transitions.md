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
  to: "waiting_on_admin",
  roles: ["admin_full", "super_admin"]
}
```

This means:

```text
If a course is currently submitted_to_admin,
only admin_full or super_admin can move it to waiting_on_admin (approve the
review and start building the staging shell).
```

## Current Main Flow

Admin approval moves the course into the **staging-shell** steps
(`waiting_on_admin` → `staging_in_progress`) before it can be sent to the
instructor — it does not jump straight to `ready_for_instructor`.

```text
course_created
→ assigned_to_ta
→ ta_review_in_progress
→ submitted_to_admin
→ waiting_on_admin        (admin approves review)
→ staging_in_progress     (staff finalizes staging)
→ ready_for_instructor    (staff marks staging complete)
→ sent_to_instructor
→ instructor_viewing      (auto-set when invite link opened)
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
  role: "admin_full",
  from: "submitted_to_admin",
  to: "waiting_on_admin"
});
```

Returns `true`.

```ts
canTransition({
  role: "standard_user",
  from: "submitted_to_admin",
  to: "waiting_on_admin"
});
```

Returns `false`. (Role keys are the profile roles from `transitions.ts`:
`super_admin`, `admin_full`, `admin_viewer`, `standard_user`, `instructor` —
`standard_user` is the reviewing staff member, labeled "TA" in the UI.)

### `getAllowedTransitions`

Returns the next statuses a role can move a course to from the current status.

```ts
getAllowedTransitions({
  role: "admin_full",
  from: "submitted_to_admin"
});
```

Returns:

```ts
["admin_changes_requested", "waiting_on_admin"]
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
