-- Clean up duplicate login emails after the move away from Supabase Auth.
-- We preserve historical profile rows by moving non-canonical duplicates onto
-- unique legacy aliases, then enforce case-insensitive uniqueness for active
-- login emails.

UPDATE public.profiles
SET email = lower(btrim(email))
WHERE email IS NOT NULL
  AND email <> lower(btrim(email));

WITH ranked AS (
  SELECT
    id,
    lower(btrim(email)) AS normalized_email,
    row_number() OVER (
      PARTITION BY lower(btrim(email))
      ORDER BY
        (password_hash IS NOT NULL) DESC,
        updated_at DESC NULLS LAST,
        created_at DESC NULLS LAST,
        id DESC
    ) AS row_num
  FROM public.profiles
  WHERE email IS NOT NULL
    AND btrim(email) <> ''
),
duplicates AS (
  SELECT id, normalized_email
  FROM ranked
  WHERE row_num > 1
)
UPDATE public.profiles p
SET email = CASE
      WHEN position('@' IN d.normalized_email) > 0 THEN
        split_part(d.normalized_email, '@', 1) ||
        '+legacy-' ||
        replace(left(p.id::text, 8), '-', '') ||
        '@' ||
        split_part(d.normalized_email, '@', 2)
      ELSE
        d.normalized_email ||
        '+legacy-' ||
        replace(left(p.id::text, 8), '-', '')
    END,
    updated_at = NOW()
FROM duplicates d
WHERE p.id = d.id;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_lower_idx
  ON public.profiles (lower(email))
  WHERE email IS NOT NULL
    AND btrim(email) <> '';
