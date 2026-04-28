import Link from "next/link";
import { signInWithEmail } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
        <div>
          <p className="text-sm font-medium text-muted-foreground">CourseBridge</p>
          <h1 className="mt-2 text-2xl font-semibold">Sign in</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Enter your email and Supabase will send you a secure sign-in link.
          </p>
        </div>

        <form action={signInWithEmail} className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-medium" htmlFor="email">
            Email
            <input
              className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              id="email"
              name="email"
              placeholder="name@example.com"
              required
              type="email"
            />
          </label>

          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {decodeURIComponent(error)}
            </p>
          ) : null}

          <button
            className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            type="submit"
          >
            Send sign-in link
          </button>
        </form>

        <Link
          className="mt-4 block text-sm text-muted-foreground hover:text-foreground"
          href="/"
        >
          Back to project overview
        </Link>
      </section>
    </main>
  );
}
