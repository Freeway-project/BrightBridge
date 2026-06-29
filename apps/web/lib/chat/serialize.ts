/**
 * Timestamp serialization helpers for the chat layer.
 *
 * node-pg returns `timestamptz` columns as JS `Date` objects (no type parser is
 * registered on the pool). The chat row types declare these fields as ISO
 * `string`, and those rows cross the RSC boundary into client components — where
 * the React Flight serializer PRESERVES `Date` instances. A `Date` therefore
 * reaches code that expects a string (e.g. `createdAt.localeCompare(...)`),
 * throwing "localeCompare is not a function". Normalizing at the query boundary
 * makes the declared `string` types true again.
 *
 * Pure and dependency-free (no `server-only`) so they can be unit-tested directly.
 */

/** Coerce a node-pg timestamp value (`Date` or already-`string`) to an ISO 8601 string. */
export function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value
}

/** Like {@link toIsoString}, but preserves SQL NULLs as `null`. */
export function toIsoStringOrNull(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined) return null
  return value instanceof Date ? value.toISOString() : value
}
