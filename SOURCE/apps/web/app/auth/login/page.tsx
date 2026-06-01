import { FileCheck, GitMerge, KeyRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OCLoadingLogo } from "@/components/shared/oc-loading-logo";
import { startAzureOidcSignInAction } from "./actions";

const FEATURES = [
  {
    icon: GitMerge,
    title: "Structured migration reviews",
    desc: "Step-by-step TA checklists for every Moodle -> Brightspace course.",
  },
  {
    icon: Users,
    title: "Controlled role access",
    desc: "Super admins manage account creation and role changes centrally.",
  },
  {
    icon: FileCheck,
    title: "Full audit trail",
    desc: "Every workflow handoff and decision stays tied to the course record.",
  },
];

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-background flex">
      <div className="hidden lg:flex w-1/2 flex-col justify-between bg-sidebar border-r border-sidebar-border px-12 py-14">
        <div className="flex items-center gap-1">
          <OCLoadingLogo className="size-12 shrink-0" />
          <span className="text-lg font-semibold text-sidebar-foreground">CourseBridge</span>
        </div>

        <div className="space-y-8">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold leading-tight text-sidebar-foreground">
              Course migration,
              <br />
              <span className="text-primary">done right.</span>
            </h1>
            <p className="text-base text-sidebar-foreground/60 leading-relaxed max-w-sm">
              Internal review workspace for moving Moodle courses into Brightspace with clear ownership and staged approval.
            </p>
          </div>

          <div className="space-y-5">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex items-start gap-3">
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <feature.icon className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-sidebar-foreground">{feature.title}</p>
                  <p className="text-xs text-sidebar-foreground/50 leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-sidebar-foreground/30">
          © {new Date().getFullYear()} CourseBridge. Internal platform.
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Sign in</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Use your institutional account through Microsoft Entra ID.
            </p>
          </div>

          <form action={startAzureOidcSignInAction} className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Authenticate with your Microsoft account to continue.
              </p>
            </div>
            <Button className="w-full h-10 gap-2" type="submit">
              <KeyRound className="size-4" />
              Sign in with Microsoft
            </Button>
          </form>

          <div className="rounded-lg border border-dashed border-border px-4 py-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Need access? Ask a super admin to create your account and assign your role.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
