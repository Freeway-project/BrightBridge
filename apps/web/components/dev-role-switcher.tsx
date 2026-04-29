import { getRoleLabel, ROLES, type Role } from "@coursebridge/workflow";
import { switchDevRole } from "@/components/dev-role-switcher-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function DevRoleSwitcher() {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const admin = createAdminClient();

  if (!admin) {
    return (
      <Card className="fixed bottom-4 right-4 z-50 w-80 border-destructive/40">
        <CardHeader>
          <CardTitle>Dev role switcher unavailable</CardTitle>
          <CardDescription>
            Add SUPABASE_SERVICE_ROLE_KEY to your local env to enable role
            switching.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const currentRole = profile?.role as Role | undefined;

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-80 border-primary/40 shadow-xl">
      <CardHeader>
        <CardTitle>Dev role</CardTitle>
        <CardDescription>
          Signed in as {user.email}. Current role:{" "}
          {currentRole ? getRoleLabel(currentRole) : "None"}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2">
        {ROLES.map((role) => (
          <form action={switchDevRole} key={role}>
            <input name="role" type="hidden" value={role} />
            <Button
              className="w-full"
              size="sm"
              type="submit"
              variant={role === currentRole ? "default" : "outline"}
            >
              {getRoleLabel(role)}
            </Button>
          </form>
        ))}
      </CardContent>
    </Card>
  );
}
