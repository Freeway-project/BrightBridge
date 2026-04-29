import Link from "next/link";
import { redirect } from "next/navigation";
import { getRoleLabel } from "@coursebridge/workflow";
import { getAccessibleCourses } from "@/lib/courses/service";
import { signOut } from "./actions";

export default async function DashboardPage() {
  const { context, courses } = await getAccessibleCourses();

  if (context.kind === "anonymous") {
    redirect("/auth/login");
  }

  if (context.kind === "missing_profile") {
    return (
      <main className="min-h-screen bg-background">
        <div className="border-b border-border bg-card">
          <div className="mx-auto max-w-7xl px-6 py-4">
            <p className="text-sm font-medium text-muted-foreground">CourseBridge</p>
            <h1 className="text-2xl font-semibold">Profile Required</h1>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 py-8">
          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-xl font-semibold">Waiting for role assignment</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              You are signed in as {context.email ?? "this user"}, but this account
              does not have a CourseBridge profile yet. Ask an admin to assign your
              app role before continuing.
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              CourseBridge
            </p>
            <h1 className="text-2xl font-semibold">Dashboard</h1>
          </div>
          <form action={signOut}>
            <button
              className="h-10 rounded-md border border-input px-4 text-sm font-medium"
              type="submit"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-lg border border-border bg-card p-4">
          <nav className="grid gap-2 text-sm">
            <Link className="rounded-md bg-accent px-3 py-2" href="/dashboard">
              Dashboard
            </Link>
            <Link className="rounded-md px-3 py-2 hover:bg-accent" href="/courses">
              Courses
            </Link>
          </nav>
        </aside>

        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-xl font-semibold">Signed in</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            You are signed in as {context.profile.email} with the{" "}
            {getRoleLabel(context.profile.role)} role.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            RLS currently exposes {courses.length} accessible course
            {courses.length === 1 ? "" : "s"} for this profile.
          </p>
        </section>
      </div>
    </main>
  );
}
