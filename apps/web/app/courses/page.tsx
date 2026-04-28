import Link from "next/link";

export default function CoursesPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <p className="text-sm font-medium text-muted-foreground">CourseBridge</p>
          <h1 className="text-2xl font-semibold">Courses</h1>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-xl font-semibold">Course queue placeholder</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            This protected page is ready for Supabase-backed course lists after
            the schema and RLS policies are applied.
          </p>
          <Link
            className="mt-6 inline-flex h-10 items-center rounded-md border border-input px-4 text-sm font-medium"
            href="/dashboard"
          >
            Back to dashboard
          </Link>
        </section>
      </div>
    </main>
  );
}
