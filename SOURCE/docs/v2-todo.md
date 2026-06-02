# BrightBridge V2 TODO

Last updated: 2026-04-29

## TA Workflow Follow-ups

The TA workflow is usable as an MVP, but the following items are still deferred to V2:

- Add a real user-facing chat and comments workflow on top of `course_comments`
- Add attachment and image upload support, with files stored in R2 and only metadata stored in Postgres
- Add instructor-facing collaboration inside the TA course workspace
- Add the full admin feedback loop UI after a course reaches `submitted_to_admin`
- Finish the TA dashboard refactor that is currently still in local working-tree progress

## Intended V2 Outcome

V2 should extend the current TA review capture flow into a collaborative review workflow where:

- TAs, Admins, and Instructors can communicate within the course context
- feedback can loop back cleanly after admin review
- attachments can support review evidence and discussion
- the TA dashboard uses the consolidated newer course-list experience
