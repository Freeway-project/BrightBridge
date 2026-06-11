import "server-only";

import { getHierarchyRepository } from "@/lib/repositories";

// Org-hierarchy leadership titles, highest authority first. A holder of any of
// these can act on an instructor's behalf for courses in their org-unit subtree.
// Must stay a subset of org_unit_members.title's CHECK constraint — "chair" is
// not a valid title, and "vp"/"associate_dean" are real titles that must be
// included.
export const LEADERSHIP_TITLES_BY_RANK = [
  "vp",
  "dean",
  "associate_dean",
  "assistant_dean",
  "dept_head",
] as const;

export const LEADERSHIP_TITLES = new Set<string>(LEADERSHIP_TITLES_BY_RANK);

/** The highest-ranked leadership title in `titles`, or null if none qualify. */
export function highestLeadershipTitle(titles: readonly string[]): string | null {
  for (const title of LEADERSHIP_TITLES_BY_RANK) {
    if (titles.includes(title)) return title;
  }
  return null;
}

/**
 * Resolves each given profile's highest leadership title in one pass. Used to
 * label conversation authors ("Dr. Lee — Dean") without an N+1 per comment:
 * one listAllMembers() read, mapped in memory.
 */
export async function resolveLeaderTitleMap(
  profileIds: readonly string[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (profileIds.length === 0) return result;

  const wanted = new Set(profileIds);
  const members = await getHierarchyRepository().listAllMembers();

  const titlesByProfile = new Map<string, string[]>();
  for (const m of members) {
    if (!wanted.has(m.profileId)) continue;
    const list = titlesByProfile.get(m.profileId) ?? [];
    list.push(m.title);
    titlesByProfile.set(m.profileId, list);
  }

  for (const [profileId, titles] of titlesByProfile) {
    const top = highestLeadershipTitle(titles);
    if (top) result.set(profileId, top);
  }

  return result;
}
