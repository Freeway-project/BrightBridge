'use server'

import { revalidatePath } from 'next/cache'
import { requireProfile } from '@/lib/auth/context'
import { createClient } from '@supabase/supabase-js'
import { ThemeType } from './config'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function saveThemePreferenceAction(theme: ThemeType): Promise<void> {
  try {
    const ctx = await requireProfile()

    const { error } = await supabase
      .from('profiles')
      .update({ theme_preference: theme })
      .eq('id', ctx.userId)

    if (error) {
      console.error('[saveThemePreferenceAction] DB error:', error)
      throw new Error(error.message || 'Failed to save theme preference')
    }

    // Revalidate dashboard to reflect theme change
    revalidatePath('/')
  } catch (err) {
    console.error('[saveThemePreferenceAction] Error:', err)
    throw err instanceof Error ? err : new Error('Failed to save theme preference')
  }
}
