/**
 * Birthday surprise — configuration & gating.
 *
 * A one-person, one-day celebration. Everything the feature does is gated
 * behind {@link isBirthdayUser}, so flipping {@link BIRTHDAY_ENABLED} to
 * `false` (or letting the date pass) removes it everywhere with zero residue.
 *
 * No other user is ever affected: the predicate requires an exact user-id
 * match AND the configured calendar date.
 */

/** Master switch. Set to `false` to instantly disable the surprise everywhere. */
export const BIRTHDAY_ENABLED = true;

/** The one user who gets the birthday dashboard (Ava Roy), matched by profile id. */
export const AVA_USER_ID = "192b6cd9-5c3a-4dde-a2a8-6bea80cd923a";

/** The single calendar day the surprise is active, `YYYY-MM-DD`. After this it auto-expires. */
export const BIRTHDAY_DATE = "2026-06-29";

/** Timezone the calendar day is evaluated in (Okanagan / BC). Change if Ava is elsewhere. */
export const BIRTHDAY_TIME_ZONE = "America/Vancouver";

/** The milestone — she's turning 20. Drives the "19 → 20" sidebar flip. */
export const BIRTHDAY_AGE_FROM = 19;
export const BIRTHDAY_AGE_TO = 20;

/** True when `now`, viewed in {@link BIRTHDAY_TIME_ZONE}, falls on {@link BIRTHDAY_DATE}. */
export function isBirthdayToday(now: Date = new Date()): boolean {
  // en-CA formats as YYYY-MM-DD, which matches BIRTHDAY_DATE directly.
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: BIRTHDAY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return today === BIRTHDAY_DATE;
}

/**
 * The single source of truth for "should this user see the birthday dashboard?".
 * Requires: the master switch on, an exact id match, and today being the birthday.
 */
export function isBirthdayUser(
  profile: { id: string } | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!BIRTHDAY_ENABLED) return false;
  if (!profile) return false;
  if (profile.id !== AVA_USER_ID) return false;
  return isBirthdayToday(now);
}
