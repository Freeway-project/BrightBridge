import "server-only";

import type { Role } from "@coursebridge/workflow";
import { getProfileRepository } from "@/lib/repositories";
import type { ProfileOption } from "@/lib/repositories/contracts";
export type { ProfileOption } from "@/lib/repositories/contracts";

export async function getProfilesByRole(role: Role): Promise<ProfileOption[]> {
  return getProfileRepository().getProfilesByRole(role);
}
