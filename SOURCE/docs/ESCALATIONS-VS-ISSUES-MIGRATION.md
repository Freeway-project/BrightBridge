# Escalations vs Issues — Understanding the Dual System

**Key Point:** Both old escalations and new issues coexist in production. This is intentional, not a bug.

---

## Current Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE DATABASE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  OLD SYSTEM (Still Active)                                      │
│  ┌────────────────────────────┐                                │
│  │ course_escalations         │  ← Used by escalations tab    │
│  │ escalation_messages        │     Still queried by code     │
│  └────────────────────────────┘                                │
│           ↓ (Data copied, not removed)                          │
│                                                                 │
│  NEW SYSTEM (Branch Feature)                                    │
│  ┌─────────────────────────────────────────┐                  │
│  │ course_issues               (3 tables)   │ ← Used by new    │
│  │ ├─ course_issues            │            │   Issues tab    │
│  │ ├─ course_issue_comments    │            │   & Notifications
│  │ └─ issue_comment_mentions   │            │                 │
│  └─────────────────────────────────────────┘                  │
│           ↑ (Migration copies escalations here)                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## What Data Goes Where?

### During Deploy (Migration 20260511000001)

**Step 1: Copy Escalations → Issues**
```
course_escalations
├─ id = abc123
├─ course_id = xyz789
├─ severity = "critical"
├─ title = "Missing Gradebook Link"
├─ status = "open"
└─ created_by = user123

           ↓ CONVERTS TO ↓

course_issues
├─ id = new_uuid_001
├─ course_id = xyz789
├─ severity = "critical"  ✅ Same
├─ title = "Missing Gradebook Link"  ✅ Same
├─ status = "open"  ✅ Same
├─ type = "escalation"  🆕 Added
├─ phase = "migration"  🆕 Added
├─ created_by = user123  ✅ Same
├─ legacy_escalation_id = abc123  🔗 Links back to original
└─ created_at = original_timestamp  ✅ Same
```

**Step 2: Copy Messages → Comments**
```
escalation_messages
├─ id = msg456
├─ escalation_id = abc123  (old table)
├─ author_id = user456
├─ body = "We need this ASAP!"
└─ created_at = timestamp

           ↓ CONVERTS TO ↓

course_issue_comments
├─ id = new_uuid_002
├─ issue_id = new_uuid_001  (references new course_issues row)
├─ author_id = user456  ✅ Same
├─ body = "We need this ASAP!"  ✅ Same
├─ is_system_message = false  (default)
└─ created_at = original_timestamp  ✅ Same
```

---

## After Deploy: User Perspective

### Scenario 1: User Opens "Escalations" Tab

```
┌──────────────────────────────────────────────┐
│            ESCALATIONS TAB                    │
├──────────────────────────────────────────────┤
│                                               │
│  Code Query:                                  │
│  SELECT * FROM course_escalations             │
│  WHERE course_id = $1                         │
│                                               │
│  Result: Shows ONLY escalations               │
│  (Reads from old table, not new one)          │
│                                               │
│  ✅ Still works                               │
│  ✅ All old messages show up                  │
│  ✅ Status updates still work                 │
│                                               │
└──────────────────────────────────────────────┘
```

### Scenario 2: User Opens "Issues" Tab (NEW)

```
┌──────────────────────────────────────────────┐
│              ISSUES TAB (NEW)                 │
├──────────────────────────────────────────────┤
│                                               │
│  Code Query:                                  │
│  SELECT * FROM course_issues                  │
│  WHERE course_id = $1                         │
│  AND type IN ('escalation', 'question',       │
│               'fix_needed', 'general')        │
│                                               │
│  Result: Shows ALL types including copied    │
│  old escalations (type='escalation')          │
│                                               │
│  ⚠️ OVERLAP: Old escalations appear here too  │
│  ✅ Not a bug — intentional for compatibility│
│                                               │
└──────────────────────────────────────────────┘
```

### Scenario 3: New Issue Created AFTER Deploy

```
BEFORE DEPLOY:
  course_escalations    (source of old system)
  course_issues         (empty, new tables)

AFTER DEPLOY:
  course_escalations    (original 47 escalations)
  course_issues         (47 migrated + any NEW ones created post-deploy)

NEW ISSUE CREATED as TA:
  User clicks "Create Issue" in Issues tab
  → Only inserts into course_issues (NOT course_escalations)
  → Does NOT appear in Escalations tab
  → Only in Issues tab
```

---

## Why This Design?

### Goals
1. ✅ **Zero Data Loss** — Every old escalation accessible
2. ✅ **Backward Compatible** — Old escalations tab still works
3. ✅ **Clean New Feature** — Issues tab uses modern schema
4. ✅ **Safe Migration** — Can deprecate old system anytime

### Tradeoffs
- ⚠️ **Duplication** — Old escalations visible in 2 tabs
- ⚠️ **Two Code Paths** — App queries both tables
- ⚠️ **Temporary** — Plan to deprecate old system later

### When to Deprecate Escalations Table
1. Wait 2-4 weeks (let users adapt to new Issues tab)
2. Verify Issues tab fully covers escalations use cases
3. Create `issue_export_legacy_data` script (backup old escalations)
4. Modify code to ONLY query `course_issues`
5. Drop `course_escalations` table in Q3 2026

---

## Access Control: What Each Role Sees

### Migration Phase (Course in migration → ta_review_in_progress)

| Tab | TA Assigned | Admin | Instructor | Super Admin |
|-----|---|---|---|---|
| **Escalations** | ✅ Sees all for course | ✅ Sees all | ❌ No | ✅ Sees all |
| **Issues** | ✅ Sees all for course | ✅ Sees all | ❌ No | ✅ Sees all |

RLS Policy: Phase-based + course assignment

### Staging/Provision Phase (Later lifecycle)

| Tab | TA Assigned | Admin | Instructor | Super Admin |
|-----|---|---|---|---|
| **Escalations** | ❌ No access (old table) | ✅ Sees all | ✅ Sees assigned | ✅ Sees all |
| **Issues** | Phase-restricted | ✅ Full | ✅ Provision only | ✅ Full |

RLS Policy: Stricter (prevents TA from modifying)

---

## Common Questions

### Q: Will old escalations disappear after deploy?
**A:** No. They stay in `course_escalations` table forever (unless manually deleted). They're copied to `course_issues`, not moved.

### Q: Why do escalations appear in 2 tabs?
**A:** Because:
1. Old escalations are still in `course_escalations` (used by Escalations tab)
2. They're also copied to `course_issues` with type='escalation' (used by Issues tab)
3. This is intentional for 100% backward compatibility

### Q: If I update an escalation status in the Escalations tab, what happens?
**A:** Only `course_escalations` row is updated. The copy in `course_issues` stays as-is (unless you manually sync them later).

**Solution:** Don't use Escalations tab after deploy. Only use Issues tab.

### Q: What if I create a new issue using the Issues tab?
**A:** Only created in `course_issues`. Does NOT create corresponding `course_escalations` row. Only visible in Issues tab.

**Expected:** Escalations tab shows old data only. Issues tab shows old + new.

### Q: What about notifications?
**A:** Notifications only listen to `course_issues` realtime events. Old escalations don't trigger notifications unless manually re-raised as new Issues.

### Q: Can I edit/delete a migrated escalation?
**A:** 
- Update/delete in `course_escalations`? Yes (RLS allows admins)
- Update/delete in `course_issues`? Yes (RLS allows admins)
- **Effect:** Changes BOTH rows (manual action, not automatic)
- **Risk:** They can get out of sync

**Mitigation:** Admin GUI only allows one path (Issues tab). No UI for direct escalation editing.

---

## Testing Checklist for Production

### Pre-Deploy (Dev Environment)

- [ ] Create escalation using old flow
- [ ] Verify it appears in both Escalations AND Issues tabs
- [ ] Create new Issue (post-migration mindset)
- [ ] Verify it ONLY appears in Issues tab (NOT escalations)
- [ ] Update issue status in Issues tab → notification fires
- [ ] Update escalation status in Escalations tab → no notification (expected)

### Post-Deploy (First 24h)

- [ ] Query counts match:
  ```sql
  SELECT COUNT(*) FROM course_escalations;  -- say N
  SELECT COUNT(*) FROM course_issues 
  WHERE type = 'escalation';  -- should also = N
  ```
- [ ] Comments match:
  ```sql
  SELECT COUNT(*) FROM escalation_messages;  -- say M
  SELECT COUNT(*) FROM course_issue_comments
  WHERE issue_id IN (SELECT id FROM course_issues 
                     WHERE type = 'escalation');  -- should = M
  ```
- [ ] No orphaned comments
- [ ] Access control works (TA can't see unassigned, Admin can see all)

### If Issues Don't Match

```sql
-- Check for missed migrations
SELECT e.id, COUNT(em.id) as msg_count
FROM course_escalations e
LEFT JOIN escalation_messages em ON em.escalation_id = e.id
GROUP BY e.id
HAVING COUNT(em.id) > (
  SELECT COUNT(*) FROM course_issue_comments
  WHERE issue_id = (SELECT id FROM course_issues 
                    WHERE legacy_escalation_id = e.id)
);
```

If any rows return: Some escalations weren't fully migrated. Contact Supabase support.

---

## Summary

| Aspect | Old System | New System | Coexistence |
|--------|---|---|---|
| Tables | course_escalations | course_issues | Both exist |
| UI Tab | "Escalations" | "Issues" | Both tabs work |
| New Entries | ❌ Don't create | ✅ Create | New = issues only |
| Data Copied | N/A | ✅ Copies from old | All historical data migrated |
| RLS Policies | ✅ Existing | ✅ New | Both enforced |
| Notifications | ❌ None | ✅ Full | Issues tab only |
| Realtime | Old flow | New channels | Separate subscriptions |
| Deprecation | Q3 2026 plan | Growing | Planned sunset |

**Bottom Line:** Think of it as a phased migration. Old system is preserved, new system runs in parallel. After stabilization period, old system removed.

This is the safest approach for zero-downtime migration. ✅
