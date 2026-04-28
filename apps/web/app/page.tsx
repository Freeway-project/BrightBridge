import { COURSE_STATUSES, ROLES } from "@coursebridge/workflow";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
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
        <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase text-muted-foreground">
                Roles
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
            {ROLES.map((role) => (
              <div
                className="rounded-md border border-border px-3 py-2 text-sm"
                key={role}
              >
                {getRoleLabel(role)}
              </div>
            ))}
            </CardContent>
        </Card>

        <section className="grid gap-6">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-xl">Foundation Ready</CardTitle>
                <CardDescription className="mt-2 max-w-2xl leading-6">
                  This starter shell keeps the first step focused on project
                  structure, shared packages, and a visible app surface. Business
                  features, Supabase, storage, and PDF export are intentionally
                  left for later tasks.
                </CardDescription>
              </div>
              <Badge>{COURSE_STATUSES[0]}</Badge>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">MVP Review Flow</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {reviewSteps.map((step, index) => (
                <div
                  className="rounded-md border border-border p-4"
                  key={step}
                >
                  <div className="text-sm font-semibold text-muted-foreground">
                    Step {index + 1}
                  </div>
                  <div className="mt-2 text-sm">{step}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
