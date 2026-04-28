import Link from "next/link";

type CheckEmailPageProps = {
  searchParams: Promise<{
    email?: string;
  }>;
};

export default async function CheckEmailPage({
  searchParams
}: CheckEmailPageProps) {
  const { email } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">CourseBridge</p>
        <h1 className="mt-2 text-2xl font-semibold">Check your email</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          We sent a secure sign-in link{email ? ` to ${email}` : ""}. Open it to
          continue to your dashboard.
        </p>
        <Link
          className="mt-6 inline-flex h-10 items-center rounded-md border border-input px-4 text-sm font-medium"
          href="/auth/login"
        >
          Use a different email
        </Link>
      </section>
    </main>
  );
}
