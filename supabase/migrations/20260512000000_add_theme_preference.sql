-- Add theme preference to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'ocean' CHECK (theme_preference IN ('ocean', 'sunset', 'monochrome', 'aurora'));

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_theme_preference ON profiles(theme_preference);

-- Update existing profiles to have ocean as default
UPDATE profiles SET theme_preference = 'ocean' WHERE theme_preference IS NULL;
