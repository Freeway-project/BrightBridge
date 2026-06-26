import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Role } from "@coursebridge/workflow";
import { getAuthContext } from "@/lib/auth/context";
import { isReadonlyMode } from "@/lib/system-migration";
import { getHierarchyRepository } from "@/lib/repositories";
import { LEADERSHIP_TITLES } from "@/lib/hierarchy/leadership";

const ROLE_ROUTES: Record<Role, string> = {
  standard_user: "/ta",
  admin_full: "/admin",
  // admin_viewer gets the same Admin Dashboard as admin_full, but read-only
  // (all mutating controls are hidden; server actions already reject the role).
  admin_viewer: "/admin",
  instructor: "/instructor",
  super_admin: "/super-admin",
  // Provost lands on the Hierarchy explorer — the most useful view for
  // institution-wide oversight. The /provost dashboard stays reachable via nav.
  provost: "/hierarchy",
};

export default async function DashboardPage() {
  const headerStore = await headers();

  if (isReadonlyMode(headerStore.get("host"))) {
    redirect("/maintenance");
  }

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

  const role = context.profile.role;

  // Hierarchy leaders (Dean, VP, etc.) land on the org explorer — it's more
  // useful as a home base than their personal course review queue.
  if (role === "instructor") {
    const hierarchy = getHierarchyRepository();
    const userUnits = await hierarchy.getUserUnits(context.profile.id);
    const isLeader = userUnits.some((u) => LEADERSHIP_TITLES.has(u.title));
    if (isLeader) redirect("/hierarchy");
  }

  redirect(ROLE_ROUTES[role]);
}
