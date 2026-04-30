import { redirect } from "next/navigation";
import type { Role } from "@coursebridge/workflow";
import { getAuthContext } from "@/lib/auth/context";

const ROLE_ROUTES: Record<Role, string> = {
  standard_user: "/ta",
  admin_full: "/admin",
  admin_viewer: "/communications",
  instructor: "/instructor",
  super_admin: "/super-admin",
};

export default async function DashboardPage() {
  const context = await getAuthContext();

  if (context.kind === "anonymous") {
    redirect("/auth/login");
  }

  if (context.kind === "missing_profile") {
    return (
      <main className="min-h-screen bg-background px-6 py-10">
        <section className="mx-auto max-w-xl rounded-lg border border-border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">CourseBridge</p>
          <h1 className="mt-2 text-2xl font-semibold">Profile Required</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            You are signed in as {context.email ?? "this user"}, but this account does
            not have a CourseBridge profile yet. Ask an admin to assign your app role
            before continuing.
          </p>
        </section>
      </main>
    );
  }

  redirect(ROLE_ROUTES[context.profile.role]);
}
