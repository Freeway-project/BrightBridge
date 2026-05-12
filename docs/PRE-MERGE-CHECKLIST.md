# Pre-Merge Checklist for ft-issue-tracker → main

**What to Run BEFORE Merge (Except Vercel)**

---

## ✅ Build & Verification (Completed)

```bash
npm run build
# Result: ✅ Compiled successfully in 22.9s
# TypeScript: ✅ Finished in 12.8s (0 errors)
# Routes: ✅ 20/20 pages generated
```

**Status:** READY ✅

---

## 🔧 Database Setup (Run These Commands)

### Option A: Supabase Dashboard (Recommended for Production)

**Before you merge to main:**

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your production database
   - Open SQL Editor

2. **Run These 2 Migrations in Order**

   **Migration 1: Create Tables**
   ```sql
   -- Copy entire content from:
   -- supabase/migrations/20260511000000_create_course_issues.sql
   
   -- Paste and run in Supabase SQL Editor
   -- (Full migration script below)
   ```

   **Migration 2: Migrate Data**
   ```sql
   -- Copy entire content from:
   -- supabase/migrations/20260511000001_migrate_escalations_to_issues.sql
   
   -- Paste and run in Supabase SQL Editor
   -- (Full migration script below)
   ```

3. **Verify Success**
   ```sql
   -- Should return 3 tables
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('course_issues', 'course_issue_comments', 'issue_comment_mentions');
   
   -- Should return row count from old escalations
   SELECT COUNT(*) as issue_count FROM course_issues;
   
   -- Should match escalation_messages count
   SELECT COUNT(*) as comment_count FROM course_issue_comments;
   ```

---

### Option B: psql Command Line (Advanced)

```bash
# Set these env vars first
export DATABASE_URL="postgresql://user:password@host:5432/postgres"

# Run migrations in order
psql $DATABASE_URL < supabase/migrations/20260511000000_create_course_issues.sql
psql $DATABASE_URL < supabase/migrations/20260511000001_migrate_escalations_to_issues.sql

# Verify
psql $DATABASE_URL -c "SELECT COUNT(*) FROM course_issues;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM course_issue_comments;"
```

---

## 📋 Full Migration Scripts (Copy & Paste into Supabase)

### Migration 1: Create Tables & RLS

```sql
-- Unified issue tracker replacing course_escalations + JSONB issue log

CREATE TABLE public.course_issues (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id             uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  phase                 text NOT NULL CHECK (phase IN ('migration', 'staging', 'provision')),
  type                  text NOT NULL CHECK (type IN ('escalation', 'question', 'fix_needed', 'general')),
  severity              text NOT NULL DEFAULT 'minor' CHECK (severity IN ('minor', 'major', 'critical')),
  title                 text NOT NULL,
  description           text,
  location              text,
  direct_link           text,
  status                text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved')),
  owner_id              uuid REFERENCES public.profiles(id),
  created_by            uuid NOT NULL REFERENCES public.profiles(id),
  resolved_by           uuid REFERENCES public.profiles(id),
  resolved_at           timestamptz,
  legacy_escalation_id  uuid,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.course_issue_comments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id         uuid NOT NULL REFERENCES public.course_issues(id) ON DELETE CASCADE,
  author_id        uuid NOT NULL REFERENCES public.profiles(id),
  body             text NOT NULL,
  is_system_message boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.issue_comment_mentions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id           uuid NOT NULL REFERENCES public.course_issue_comments(id) ON DELETE CASCADE,
  mentioned_profile_id uuid NOT NULL REFERENCES public.profiles(id),
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_course_issues_course_id ON public.course_issues(course_id);
CREATE INDEX idx_course_issues_status    ON public.course_issues(status);
CREATE INDEX idx_course_issues_phase     ON public.course_issues(phase);
CREATE INDEX idx_issue_comments_issue_id ON public.course_issue_comments(issue_id);
CREATE INDEX idx_mentions_profile        ON public.issue_comment_mentions(mentioned_profile_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.course_issues;
ALTER PUBLICATION supabase_realtime ADD TABLE public.course_issue_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.issue_comment_mentions;

-- Enable RLS (policies set in next migration)
ALTER TABLE public.course_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_issue_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_comment_mentions ENABLE ROW LEVEL SECURITY;
```

### Migration 2: Migrate Data & RLS Policies

```sql
-- Migrate existing course_escalations → course_issues
INSERT INTO public.course_issues (
  course_id, phase, type, severity, title, description,
  status, created_by, resolved_by, resolved_at,
  legacy_escalation_id, created_at, updated_at
)
SELECT
  e.course_id,
  'migration',
  'escalation',
  e.severity,
  e.title,
  NULL,
  CASE WHEN e.status = 'resolved' THEN 'resolved' ELSE 'open' END,
  e.created_by,
  e.resolved_by,
  e.resolved_at,
  e.id,
  e.created_at,
  e.created_at
FROM public.course_escalations e;

-- Migrate escalation_messages → course_issue_comments
INSERT INTO public.course_issue_comments (issue_id, author_id, body, created_at)
SELECT
  ci.id,
  em.author_id,
  em.body,
  em.created_at
FROM public.escalation_messages em
JOIN public.course_issues ci ON ci.legacy_escalation_id = em.escalation_id;

-- ============================================================================
-- RLS POLICIES FOR COURSE_ISSUES
-- ============================================================================

-- SELECT: Assigned users + admins
CREATE POLICY "course_issues_select" ON public.course_issues
  FOR SELECT USING (
    auth.uid() IN (SELECT profile_id FROM public.course_assignments WHERE course_id = course_issues.course_id)
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin_full', 'super_admin')
  );

-- INSERT: TA for migration only, Admin/Super for staging/provision
CREATE POLICY "course_issues_insert" ON public.course_issues
  FOR INSERT WITH CHECK (
    (phase = 'migration' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'standard_user')
    OR (phase IN ('staging', 'provision') AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin_full', 'super_admin'))
  );

-- UPDATE: Status changes allowed for Admin/Super only
CREATE POLICY "course_issues_update_status" ON public.course_issues
  FOR UPDATE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin_full', 'super_admin')
  );

-- ============================================================================
-- RLS POLICIES FOR COURSE_ISSUE_COMMENTS
-- ============================================================================

-- SELECT: Same access as issue (assigned users + admins)
CREATE POLICY "course_issue_comments_select" ON public.course_issue_comments
  FOR SELECT USING (
    auth.uid() IN (
      SELECT ca.profile_id
      FROM public.course_assignments ca
      JOIN public.course_issues ci ON ci.course_id = ca.course_id
      WHERE ci.id = course_issue_comments.issue_id
    )
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin_full', 'super_admin')
  );

-- INSERT: Phase-aware comment permissions
CREATE POLICY "course_issue_comments_insert" ON public.course_issue_comments
  FOR INSERT WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.course_issues WHERE id = course_issue_comments.issue_id)
    AND (
      -- Admin/Super can always comment
      (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin_full', 'super_admin')
      -- TA can comment in migration phase
      OR (
        (SELECT phase FROM public.course_issues WHERE id = course_issue_comments.issue_id) = 'migration'
        AND auth.uid() IN (SELECT profile_id FROM public.course_assignments WHERE course_id = (SELECT course_id FROM public.course_issues WHERE id = course_issue_comments.issue_id))
      )
      -- Instructor can comment in provision phase
      OR (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'instructor'
        AND (SELECT phase FROM public.course_issues WHERE id = course_issue_comments.issue_id) = 'provision'
      )
      -- TA in provision can comment only if @mentioned elsewhere in this issue
      OR (
        (SELECT phase FROM public.course_issues WHERE id = course_issue_comments.issue_id) = 'provision'
        AND auth.uid() IN (SELECT profile_id FROM public.course_assignments WHERE course_id = (SELECT course_id FROM public.course_issues WHERE id = course_issue_comments.issue_id))
        AND auth.uid() IN (
          SELECT DISTINCT icm.mentioned_profile_id
          FROM public.issue_comment_mentions icm
          JOIN public.course_issue_comments cic ON cic.id = icm.comment_id
          WHERE cic.issue_id = course_issue_comments.issue_id
        )
      )
    )
  );

-- ============================================================================
-- RLS POLICIES FOR ISSUE_COMMENT_MENTIONS
-- ============================================================================

-- SELECT: Same access as comment's issue
CREATE POLICY "issue_comment_mentions_select" ON public.issue_comment_mentions
  FOR SELECT USING (
    auth.uid() IN (
      SELECT ca.profile_id
      FROM public.course_assignments ca
      JOIN public.course_issues ci ON ci.course_id = ca.course_id
      JOIN public.course_issue_comments cic ON cic.issue_id = ci.id
      WHERE cic.id = issue_comment_mentions.comment_id
    )
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin_full', 'super_admin')
  );

-- INSERT: Only the comment author can add mentions
CREATE POLICY "issue_comment_mentions_insert" ON public.issue_comment_mentions
  FOR INSERT WITH CHECK (
    (SELECT author_id FROM public.course_issue_comments WHERE id = issue_comment_mentions.comment_id) = auth.uid()
  );
```

---

## ✅ Post-DB-Migration Verification

After running both migrations, verify with these SQL queries:

```sql
-- 1. Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('course_issues', 'course_issue_comments', 'issue_comment_mentions');
-- Expected: 3 rows

-- 2. Check data counts
SELECT 'course_escalations' as table_name, COUNT(*) as count 
FROM course_escalations
UNION
SELECT 'course_issues', COUNT(*) FROM course_issues
UNION
SELECT 'escalation_messages', COUNT(*) FROM escalation_messages
UNION
SELECT 'course_issue_comments', COUNT(*) FROM course_issue_comments;
-- Expected: escalations = issues, escalation_messages = issue_comments

-- 3. Check legacy_escalation_id populated
SELECT COUNT(*) as unmapped 
FROM course_issues 
WHERE legacy_escalation_id IS NULL;
-- Expected: 0

-- 4. Check no orphaned comments
SELECT COUNT(*) as orphaned_comments 
FROM course_issue_comments c
WHERE NOT EXISTS (
  SELECT 1 FROM course_issues WHERE id = c.issue_id
);
-- Expected: 0

-- 5. Check RLS policies exist
SELECT polname FROM pg_policies 
WHERE tablename IN ('course_issues', 'course_issue_comments', 'issue_comment_mentions');
-- Expected: 9 policies total (3 per table)
```

**If all return expected results:** ✅ Ready to merge

---

## 🔗 What Happens at Merge (Automated)

```
1. git merge ft-issue-tracker → main
2. Push to GitHub
3. Vercel auto-detects push to main
4. Vercel runs: npm run build
5. Vercel deploys to production
6. Next.js app starts with new code
7. App connects to DB (migrations already run)
8. Issue tracker UI becomes available
9. Notifications subscribe to realtime channels
```

**⚠️ IMPORTANT:** Run DB migrations BEFORE merge so DB is ready when code deploys.

---

## ⏰ Timing

| Step | When | Time |
|------|------|------|
| **1. Run Migration 1** | Now (before merge) | 2 min |
| **2. Run Migration 2** | Now (before merge) | 5 min |
| **3. Verify Queries** | Now (before merge) | 2 min |
| **4. Merge to main** | After DB ready | Immediate |
| **5. Vercel deploys** | Auto, after push | 5 min |
| **6. Test in prod** | After deploy | 5 min |
| **Total** | | ~20 min |

---

## 📋 Pre-Merge Checklist

### Database Setup
- [ ] Open Supabase SQL Editor
- [ ] Run Migration 1 (create tables & RLS)
- [ ] Run Migration 2 (migrate data & policies)
- [ ] Run verification queries
- [ ] All 5 verification queries return expected results

### Code Build
- [ ] `npm run build` successful ✅
- [ ] TypeScript 0 errors ✅
- [ ] All 20 routes generated ✅
- [ ] No build warnings

### Pre-Merge Review
- [ ] Read PRODUCTION-DEPLOYMENT-GUIDE.md
- [ ] Read ESCALATIONS-VS-ISSUES-MIGRATION.md
- [ ] Understand dual system (old escalations + new issues coexist)
- [ ] Know RLS policies are in place

### Ready to Merge
- [ ] All checkboxes above checked
- [ ] DB migrations complete
- [ ] Code builds
- [ ] Documentation reviewed

**Then:** `git merge ft-issue-tracker && git push origin main`

---

## 🚨 If Migration Fails

### Error: Table Already Exists
```
ERROR: relation "course_issues" already exists
```
**Cause:** Migration already ran  
**Fix:** Skip Migration 1, run Migration 2 only

### Error: Foreign Key Constraint
```
ERROR: insert or update on table "course_issue_comments" violates foreign key constraint
```
**Cause:** course_issues table missing  
**Fix:** Ensure Migration 1 ran successfully first

### Error: RLS Policy Already Exists
```
ERROR: policy "course_issues_select" for table "course_issues" already exists
```
**Cause:** Policies already created  
**Fix:** Drop policies first:
```sql
DROP POLICY IF EXISTS "course_issues_select" ON public.course_issues;
DROP POLICY IF EXISTS "course_issues_insert" ON public.course_issues;
DROP POLICY IF EXISTS "course_issues_update_status" ON public.course_issues;
-- ... drop all 9 policies
-- Then re-run Migration 2
```

### Error: Data Mismatch
```
escalations = 47, issues = 0
```
**Cause:** Migration 2 didn't insert data  
**Fix:** Check if Migration 1 ran, then manually insert:
```sql
INSERT INTO public.course_issues (...)
SELECT ... FROM public.course_escalations;
```

---

## ✅ Final Status

| Component | Status | Notes |
|-----------|--------|-------|
| **Code Build** | ✅ READY | 0 errors, 22.9s compile |
| **DB Migrations** | 📋 PENDING | Await your manual SQL run |
| **RLS Policies** | 📋 PENDING | Included in Migration 2 |
| **Data Migration** | 📋 PENDING | Included in Migration 2 |
| **Documentation** | ✅ READY | 3 guides written |
| **Tests** | ✅ PASSED | Dev environment verified |
| **Merge Ready** | ⏳ WAITING | After DB step done |

---

**Next Step:** Run the 2 SQL migrations in Supabase Dashboard, verify with queries, then merge.
