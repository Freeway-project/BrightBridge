# MindFresh Reflections DB Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Save every completed MindFresh activity to Supabase — including the user's typed response for prompt-type activities — so admins can see who used MindFresh, when, in what mood, and what they wrote.

**Architecture:** A new `mindfresh_reflections` Supabase table stores one row per completed activity, tied to `auth.users`. A server action (service-role client) inserts the row on completion; the QuoteCard textarea becomes a controlled component with its value lifted to MindFreshModal, which fires the save as a non-blocking call so the completion animation is never delayed.

**Tech Stack:** Next.js Server Actions (`"use server"`), Supabase Postgres, `createAdminClient()` (service role), `requireProfile()` auth helper, framer-motion (no new deps needed).

---

## File Map

| File | Status | Responsibility |
|------|--------|---------------|
| `supabase/migrations/20260513000000_create_mindfresh_reflections.sql` | **Create** | Table DDL + RLS |
| `apps/web/lib/mindfresh/actions.ts` | **Create** | `saveMindFreshReflection` server action |
| `apps/web/components/mindfresh/QuoteCard.tsx` | **Modify** | Make textarea controlled; add `responseText` + `onResponseChange` props |
| `apps/web/components/mindfresh/MindFreshModal.tsx` | **Modify** | Add `reflectionText` state; wire QuoteCard; fire save on complete |

---

## Task 1: Create the `mindfresh_reflections` migration

**Files:**
- Create: `supabase/migrations/20260513000000_create_mindfresh_reflections.sql`

- [ ] **Step 1: Create the migration file**

```bash
cd /mnt/data/projects/BrightBridge
supabase migration new create_mindfresh_reflections
```

Rename the generated file to `20260513000000_create_mindfresh_reflections.sql` if the CLI generates a different timestamp.

- [ ] **Step 2: Write the migration SQL**

Full contents of `supabase/migrations/20260513000000_create_mindfresh_reflections.sql`:

```sql
-- Stores one row per completed MindFresh activity per user.
-- response_text is only populated for "prompt" type items.
CREATE TABLE public.mindfresh_reflections (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id       text        NOT NULL,
  item_type     text        NOT NULL CHECK (item_type IN ('quote', 'funny', 'prompt', 'breathing', 'game')),
  prompt_text   text        NOT NULL,
  response_text text,
  mood          text        CHECK (mood IN ('overwhelmed', 'neutral', 'good', 'energized')),
  mode          text        NOT NULL CHECK (mode IN ('calm', 'funny', 'focus', 'random')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mindfresh_reflections_user_id   ON public.mindfresh_reflections(user_id);
CREATE INDEX idx_mindfresh_reflections_created_at ON public.mindfresh_reflections(created_at DESC);

ALTER TABLE public.mindfresh_reflections ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert their own rows only.
CREATE POLICY "mindfresh_reflections_insert_own"
  ON public.mindfresh_reflections
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Authenticated users can read their own rows only.
CREATE POLICY "mindfresh_reflections_select_own"
  ON public.mindfresh_reflections
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

- [ ] **Step 3: Apply the migration to the local/remote DB**

```bash
# Remote (production Supabase project):
supabase db push
```

Verify the table exists:
```bash
supabase db query "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'mindfresh_reflections' ORDER BY ordinal_position;"
```

Expected output: 9 rows — id, user_id, item_id, item_type, prompt_text, response_text, mood, mode, created_at.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260513000000_create_mindfresh_reflections.sql
git commit -m "feat(db): add mindfresh_reflections table with RLS"
```

---

## Task 2: Create the server action

**Files:**
- Create: `apps/web/lib/mindfresh/actions.ts`

- [ ] **Step 1: Create the file**

Full contents of `apps/web/lib/mindfresh/actions.ts`:

```typescript
"use server"

import { requireProfile } from "@/lib/auth/context"
import { createAdminClient } from "@/lib/supabase/admin"

export type SaveReflectionInput = {
  itemId: string
  itemType: "quote" | "funny" | "prompt" | "breathing" | "game"
  promptText: string
  responseText?: string
  mood: "overwhelmed" | "neutral" | "good" | "energized" | null
  mode: "calm" | "funny" | "focus" | "random"
}

export async function saveMindFreshReflection(input: SaveReflectionInput): Promise<void> {
  const ctx = await requireProfile()
  const supabase = createAdminClient()
  if (!supabase) throw new Error("Supabase admin client unavailable")

  const { error } = await supabase.from("mindfresh_reflections").insert({
    user_id: ctx.profile.id,
    item_id: input.itemId,
    item_type: input.itemType,
    prompt_text: input.promptText,
    response_text: input.responseText?.trim() || null,
    mood: input.mood,
    mode: input.mode,
  })

  if (error) throw new Error(`saveMindFreshReflection: ${error.message}`)
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit -p apps/web/tsconfig.json 2>&1 | grep -v node_modules
```

Expected: no output (zero errors).

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/mindfresh/actions.ts
git commit -m "feat(mindfresh): add saveMindFreshReflection server action"
```

---

## Task 3: Make QuoteCard's textarea controlled

**Files:**
- Modify: `apps/web/components/mindfresh/QuoteCard.tsx`

The textarea is currently uncontrolled (no `value`/`onChange`). We need to lift the value to the parent so MindFreshModal can read it on completion.

- [ ] **Step 1: Update QuoteCard props and textarea**

Replace the existing `QuoteCard` function signature and the `{showInput && …}` block:

```typescript
export function QuoteCard({
  item,
  showInput = false,
  responseText = "",
  onResponseChange,
}: {
  item: MindFreshItem
  showInput?: boolean
  responseText?: string
  onResponseChange?: (value: string) => void
}) {
```

And update the `<Textarea>` element inside the `{showInput && (…)}` block:

```tsx
<Textarea
  value={responseText}
  onChange={(e) => onResponseChange?.(e.target.value)}
  placeholder="Type your answer here…"
  className="resize-none text-sm min-h-[72px] bg-background border-border/60 focus:border-violet-400 focus:ring-1 focus:ring-violet-400/30 transition-colors placeholder:text-muted-foreground/60"
/>
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit -p apps/web/tsconfig.json 2>&1 | grep -v node_modules
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/mindfresh/QuoteCard.tsx
git commit -m "refactor(mindfresh): make QuoteCard textarea controlled"
```

---

## Task 4: Wire MindFreshModal — state + fire-and-forget save

**Files:**
- Modify: `apps/web/components/mindfresh/MindFreshModal.tsx`

- [ ] **Step 1: Add import and state**

Add to imports at the top of `MindFreshModal.tsx`:

```typescript
import { saveMindFreshReflection } from "@/lib/mindfresh/actions"
```

Add one new state variable inside the component (alongside the existing `useState` declarations):

```typescript
const [reflectionText, setReflectionText] = useState("")
```

- [ ] **Step 2: Update `complete()` to fire the save**

Replace the existing `complete` function:

```typescript
const complete = () => {
  setCompleted(true)
  playUpgradeConfetti({ durationMs: 1200 })
  playThematicReward(mode)

  // Fire-and-forget: don't block the completion animation
  saveMindFreshReflection({
    itemId: item.id,
    itemType: item.type,
    promptText: displayItem.text,
    responseText: reflectionText || undefined,
    mood,
    mode,
  }).catch((err: unknown) => {
    console.error("[MindFresh] Failed to save reflection:", err)
  })
}
```

- [ ] **Step 3: Reset `reflectionText` in `reset()`**

Add `setReflectionText("")` inside the existing `reset` function:

```typescript
const reset = () => {
  setCompleted(false)
  setMood(null)
  setMode("random")
  setModeManuallySet(false)
  setAiText(null)
  setIsLoadingAi(false)
  setPickCount((c) => c + 1)
  setReflectionText("")          // ← add this line
}
```

- [ ] **Step 4: Pass props to QuoteCard**

Find the `<QuoteCard … />` line inside the modal's JSX and add the two new props:

```tsx
<QuoteCard
  item={displayItem}
  showInput={item.type === "prompt"}
  responseText={reflectionText}
  onResponseChange={setReflectionText}
/>
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit -p apps/web/tsconfig.json 2>&1 | grep -v node_modules
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/mindfresh/MindFreshModal.tsx
git commit -m "feat(mindfresh): save reflections to DB on activity completion"
```

---

## Task 5: Verify end-to-end

- [ ] **Step 1: Run the dev server**

```bash
cd /mnt/data/projects/BrightBridge
npm run dev
```

- [ ] **Step 2: Open a prompt-type activity and type a response**

1. Open the dashboard
2. Click "Need 15 sec?" (bottom-right)
3. Select **Focus** mode (it picks `prompt` type items)
4. Type something in the textarea
5. Wait for the countdown to hit 0 → completion card appears

- [ ] **Step 3: Verify the row was saved**

```bash
supabase db query "SELECT user_id, item_type, mood, mode, response_text, created_at FROM public.mindfresh_reflections ORDER BY created_at DESC LIMIT 5;"
```

Expected: a row with your user_id, `item_type = 'prompt'`, and `response_text` containing what you typed.

- [ ] **Step 4: Verify non-prompt types also save (no response_text)**

1. Select **Calm** mode (breathing or quote)
2. Let it auto-complete
3. Run the query again — new row with `response_text = null`

- [ ] **Step 5: Verify fire-and-forget doesn't break completion if DB is down**

In `apps/web/lib/mindfresh/actions.ts`, temporarily throw before the insert:
```typescript
throw new Error("test failure")
```
Complete an activity — completion animation should still play, error logged to console only.
Revert the test throw before committing.
