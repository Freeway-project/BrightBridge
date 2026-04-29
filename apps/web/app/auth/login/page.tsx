import { getRoleLabel, ROLES } from "@coursebridge/workflow";
import { signInAsDevRole, signInWithEmail } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, CheckCircle2, GitMerge, Users, FileCheck } from "lucide-react";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

const FEATURES = [
  {
    icon: GitMerge,
    title: "Structured migration reviews",
    desc: "Step-by-step TA checklists for every Moodle → Brightspace course.",
  },
  {
    icon: Users,
    title: "Multi-role workflow",
    desc: "TAs, Admins, Instructors, and Comm Dept each see exactly what they need.",
  },
  {
    icon: FileCheck,
    title: "Full audit trail",
    desc: "Every status change, comment, and approval is tracked end-to-end.",
  },
];

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <main className="min-h-screen bg-background flex">
      {/* ── Left branding panel ── */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between bg-sidebar border-r border-sidebar-border px-12 py-14">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            CB
          </div>
          <span className="text-lg font-semibold text-sidebar-foreground">CourseBridge</span>
        </div>

        {/* Headline */}
        <div className="space-y-8">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold leading-tight text-sidebar-foreground">
              Course migration,<br />
              <span className="text-primary">done right.</span>
            </h1>
            <p className="text-base text-sidebar-foreground/60 leading-relaxed max-w-sm">
              The review platform that keeps every Moodle → Brightspace migration
              on track — from TA checklist to final instructor approval.
            </p>
          </div>

          <div className="space-y-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-3">
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <f.icon className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-sidebar-foreground">{f.title}</p>
                  <p className="text-xs text-sidebar-foreground/50 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-sidebar-foreground/30">
          © {new Date().getFullYear()} CourseBridge. Internal platform.
        </p>
      </div>

      {/* ── Right sign-in panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
            CB
          </div>
          <span className="font-semibold text-foreground">CourseBridge</span>
        </div>

        <div className="w-full max-w-sm space-y-8">
          {/* Heading */}
          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted-foreground">
              Enter your institutional email to receive a sign-in link.
            </p>
          </div>

          {/* Sign-in form */}
          <form action={signInWithEmail} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="email">
                Email address
              </label>
              <Input
                id="email"
                name="email"
                placeholder="you@institution.edu"
                required
                type="email"
                className="h-10"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5">
                <span className="mt-0.5 text-destructive">⚠</span>
                <p className="text-sm text-destructive">{decodeURIComponent(error)}</p>
              </div>
            )}

            <Button className="w-full h-10 gap-2" type="submit">
              Send sign-in link
              <ArrowRight className="size-4" />
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* What to expect */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-2">
            <p className="text-xs font-medium text-foreground">What happens next</p>
            {[
              "We'll email you a secure, one-time sign-in link",
              "Click the link to access your dashboard",
              "No password needed — links expire in 1 hour",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <p className="text-xs text-muted-foreground">{step}</p>
              </div>
            ))}
          </div>

          {/* Dev quick-login */}
          {process.env.NODE_ENV === "development" && (
            <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
              <div>
                <p className="text-xs font-medium text-foreground">Dev quick login</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Bypasses email — dev environment only.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {ROLES.map((role) => (
                  <form action={signInAsDevRole} key={role}>
                    <input name="role" type="hidden" value={role} />
                    <Button className="w-full" size="sm" type="submit" variant="outline">
                      {getRoleLabel(role)}
                    </Button>
                  </form>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
