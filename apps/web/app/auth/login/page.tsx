import Link from "next/link";
import { getRoleLabel, ROLES } from "@coursebridge/workflow";
import { signInAsDevRole, signInWithEmail } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="text-sm font-medium text-muted-foreground">CourseBridge</p>
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <CardDescription className="leading-6">
            Enter your email and Supabase will send you a secure sign-in link.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form action={signInWithEmail} className="grid gap-4">
            <label className="grid gap-2 text-sm font-medium" htmlFor="email">
              Email
              <Input
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

            <Button className="w-full" size="lg" type="submit">
              Send sign-in link
            </Button>
          </form>

          {process.env.NODE_ENV === "development" ? (
            <div className="mt-6 border-t border-border pt-4">
              <p className="text-sm font-medium">Dev quick login</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Requires running npm run seed:dev first.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {ROLES.map((role) => (
                  <form action={signInAsDevRole} key={role}>
                    <input name="role" type="hidden" value={role} />
                    <Button
                      className="w-full"
                      size="sm"
                      type="submit"
                      variant="outline"
                    >
                      {getRoleLabel(role)}
                    </Button>
                  </form>
                ))}
              </div>
            </div>
          ) : null}

          <Button asChild className="mt-4 px-0" variant="link">
            <Link href="/">Back to project overview</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
