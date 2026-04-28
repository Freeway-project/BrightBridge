import {
  COURSE_STATUSES,
  getCourseStatusLabel,
  getRoleLabel,
  ROLES
} from "@coursebridge/workflow";
import { Badge } from "@coursebridge/ui";

const reviewSteps = [
  "Create course",
  "Assign TA and instructor",
  "Complete TA review",
  "Submit to admin",
  "Send to instructor",
  "Final approval"
];

export default function Home() {
  return (
    <main className="min-h-screen">
      <div className="border-b border-[color:var(--border)] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm font-semibold text-[color:var(--accent)]">
              CourseBridge
            </p>
            <h1 className="text-2xl font-semibold tracking-normal">
              Migration Review Dashboard
            </h1>
          </div>
          <Badge>Project shell</Badge>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-lg border border-[color:var(--border)] bg-white p-4">
          <h2 className="text-sm font-semibold uppercase text-[color:var(--muted)]">
            Roles
          </h2>
          <div className="mt-4 grid gap-2">
            {ROLES.map((role) => (
              <div
                className="rounded-md border border-[color:var(--border)] px-3 py-2 text-sm"
                key={role}
              >
                {getRoleLabel(role)}
              </div>
            ))}
          </div>
        </aside>

        <section className="grid gap-6">
          <div className="rounded-lg border border-[color:var(--border)] bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Foundation Ready</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--muted)]">
                  This starter shell keeps the first step focused on project
                  structure, shared packages, and a visible app surface. Business
                  features, Supabase, storage, and PDF export are intentionally
                  left for later tasks.
                </p>
              </div>
              <Badge>{getCourseStatusLabel(COURSE_STATUSES[0])}</Badge>
            </div>
          </div>

          <div className="rounded-lg border border-[color:var(--border)] bg-white p-6">
            <h2 className="text-xl font-semibold">MVP Review Flow</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {reviewSteps.map((step, index) => (
                <div
                  className="rounded-md border border-[color:var(--border)] p-4"
                  key={step}
                >
                  <div className="text-sm font-semibold text-[color:var(--accent)]">
                    Step {index + 1}
                  </div>
                  <div className="mt-2 text-sm">{step}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
