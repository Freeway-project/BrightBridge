# CourseBridge — AI Development Context

## Project Overview

CourseBridge is a web-based workflow and collaboration platform for managing Moodle to Brightspace course migration reviews.

The platform helps TAs, Admins, Communication Department staff, Instructors, and Super Admins track course review progress, complete structured review forms, manage issues, communicate in course-level threads, attach files/screenshots, export PDFs, and approve courses through a controlled workflow.

This is not just a form app. It is a course review case-management system.

## Core Roles

- TA: Reviews assigned migrated courses and completes checklist forms.
- Admin: Reviews TA submissions, confirms key items, approves or requests fixes.
- Communication Department: Sends approved review packages to instructors and coordinates questions.
- Instructor: Reviews the migrated course package, asks questions, raises issues, and approves.
- Super Admin: Manages users, templates, courses, permissions, and system configuration.

## Core Workflow

Course Created
→ Assigned to TA
→ TA Review Started
→ TA completes metadata, review matrix, syllabus, and gradebook review
→ TA submits to Admin
→ Admin approves or requests fixes
→ Approved course moves to Communication Department
→ Communication Department sends to Instructor
→ Instructor reviews, asks questions, or approves
→ Issues/questions are resolved
→ Course becomes Final Approved / Ready for Staging

## Initial Tech Stack

- Monorepo: Turborepo
- Frontend: Next.js App Router
- Language: TypeScript
- UI: Tailwind CSS + shadcn/ui
- Forms: React Hook Form + Zod
- Tables: TanStack Table
- Database: Supabase Postgres
- Auth: Supabase Auth
- Realtime: Supabase Realtime
- Storage: Cloudflare R2
- Hosting: Vercel
- PDF export: Later, likely Next.js route first, separate worker later
- Notifications: In-app first, browser push later

## Engineering Principles

1. Build around workflow and permissions, not only forms.
2. Do not allow random direct status updates from UI.
3. Use a workflow/state-machine layer for course status transitions.
4. Every important status change should create history/audit records later.
5. Store files in object storage, not in the database.
6. Store file metadata in Postgres.
7. Keep instructor-visible and internal comments separate.
8. Keep early development simple and avoid overengineering.
9. Build in small scoped tasks.
10. Do not modify unrelated files unless necessary.

## MVP Goal

The first MVP should allow:

1. Admin creates a course.
2. Admin assigns TA and Instructor.
3. TA opens assigned course.
4. TA completes review forms.
5. TA submits to Admin.
6. Admin approves or requests fixes.
7. Communication Department sends review to Instructor.
8. Instructor asks questions or approves.
9. Course reaches final approved status.

## Current Development Stage

We are at initial project setup stage.

Do not build the full app at once.

Start with:
- Turborepo setup
- Next.js app
- shared packages
- basic docs
- basic UI shell
- initial Supabase connection later
