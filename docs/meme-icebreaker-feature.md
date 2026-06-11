# Meme Icebreaker Feature - Complete Guide

## Where the Meme Button Appears

### **Location: Top-Right Corner of Every Dashboard Page**

```
┌─────────────────────────────────────────────────────────────┐
│  [≡] Course Workspace    Step 1 of 5 — Metadata          │
│                                          😊  🔔             │
│                                       Meme Notifications    │
└─────────────────────────────────────────────────────────────┘
                                        ↑
                                   YOU ARE HERE
```

### **Visual Layout**

**Topbar Components (Right Side):**
```
[Course Status Badge] [Action Buttons] [😊 Meme] [🔔 Bell]
                                       ↑
                                   Smile Icon
                                   (Meme Button)
```

## When the Meme Button Shows

### ✅ **VISIBLE TO:**
- **Standard User (Staff/TA)**
- Role: `standard_user`
- Examples: Course reviewers, TAs, review staff

### ❌ **NOT VISIBLE TO:**
- Admin (admin_full) ❌
- Super Admin (super_admin) ❌
- Instructor ❌
- Viewer (admin_viewer) ❌

### ⏰ **ALWAYS SHOWS WHEN:**
1. You are logged in
2. You are viewing a dashboard page
3. Your role is `standard_user`
4. RapidAPI key is configured

## Pages Where Meme Button Appears

The meme button appears on **ALL dashboard pages** that use the Topbar:

### Course Review Pages (Staff Uses Most)
- ✅ **Metadata** - `/courses/[id]/metadata`
- ✅ **Review Matrix** - `/courses/[id]/review-matrix`
- ✅ **Syllabus & Gradebook** - `/courses/[id]/syllabus-gradebook`
- ✅ **Issue Log** - `/courses/[id]/issue-log`
- ✅ **Submit** - `/courses/[id]/submit`
- ✅ **Course Details** - `/courses/[id]`

### Staff Dashboard
- ✅ **Courses List** - `/courses`
- ✅ **Communications** - `/communications`
- ✅ **Guide** - `/guide`
- ✅ **Notifications** - `/notifications`
- ✅ **TA Dashboard** - `/ta`

### Admin Pages (Only visible if admin is also standard_user)
- ✅ **Admin Dashboard** - `/admin`
- ✅ **Admin Queue** - `/admin/queue`
- ✅ **Course Details** - `/admin/courses/[id]`

## How to Use It

### Step 1: Navigate to Any Dashboard Page
```
1. Open: http://10.0.0.57:3000/dashboard
2. You should see the dashboard with courses
```

### Step 2: Locate the Smile Icon
```
Look at the TOP-RIGHT corner of the page
You'll see: [Status Badge] [😊] [🔔]
                          ↑
                    Click here for meme
```

### Step 3: Click the Smile Icon 😊
```
Click anywhere on the smile icon
A modal/popup appears with a meme
```

### Step 4: View Meme
```
Modal shows:
┌──────────────────────────────┐
│  Icebreaker Meme 😄          │
├──────────────────────────────┤
│                              │
│    [MEME IMAGE HERE]         │
│                              │
│    "Meme Title/Caption"      │
│                              │
│  [Get Another Meme] [Close]  │
└──────────────────────────────┘
```

### Step 5: Get More Memes (Optional)
```
Click "Get Another Meme" button to fetch another random meme
Or close the modal by clicking X or outside the modal
```

## Meme Modal Details

### **Modal Contents:**
- **Title:** "Icebreaker Meme 😄"
- **Image:** Reddit meme from trending subreddits
- **Button:** "Get Another Meme" (loads new meme)
- **Close:** Click outside modal or X button

### **Features:**
- ✅ Loads random Reddit memes
- ✅ Shows meme title
- ✅ Click to load more memes
- ✅ No limit on how many you can view
- ✅ Fast loading (uses RapidAPI)

## Technical Details

### **Component:**
- **File:** `components/meme-modal.tsx`
- **Provider:** `components/providers/meme-provider.tsx`
- **API:** `lib/meme-api.ts`
- **Topbar Integration:** `components/layout/topbar.tsx`

### **API Source:**
- **Provider:** RapidAPI
- **Endpoint:** Reddit Meme API
- **Rate Limit:** Free tier (check RapidAPI)
- **Response Time:** ~500ms average

### **Environment Required:**
```
NEXT_PUBLIC_RAPIDAPI_KEY=your_key_here
```

## Troubleshooting

### Problem: Can't see the smile icon 😊

**Check 1: Are you logged in as Staff (standard_user)?**
- Go to profile/settings
- Check your role
- Must be "Staff" or "standard_user"

**Check 2: Is the page a dashboard page?**
- Meme button only shows on dashboard pages
- Not on login page, public pages, etc.

**Check 3: Is RapidAPI key configured?**
```bash
# Check in environment
echo $NEXT_PUBLIC_RAPIDAPI_KEY
# Should return: (not empty)
```

**Check 4: Browser cache?**
- Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Clear cookies/cache if needed

**Check 5: Is the app running?**
```bash
curl http://localhost:3000/api/version
# Should return version info
```

### Problem: Click meme button but nothing happens

**Solution:**
- Check browser console (F12 → Console)
- Look for errors
- Check if RapidAPI key is valid
- Try refreshing the page

### Problem: Meme doesn't load / stuck loading

**Solution:**
- Check RapidAPI quota (may have hit limit)
- Try again in 5 minutes
- Check browser network tab (F12 → Network)
- Look for API call status

## Usage Tips

💡 **Best Times to Use:**
- Between course reviews
- When feeling overwhelmed with reviews
- Quick mental break
- Share a laugh with team

💡 **Fun Facts:**
- Different meme every time
- From real Reddit trending posts
- 100% safe, moderated content
- No login required to view memes

💡 **Features Coming Soon:**
- Save favorite memes
- Share memes with team
- Meme statistics
- Custom meme collections

## Blush Theme (Optional)

The meme button also appears with the new **Blush Theme** (soft pastel colors):

**To enable Blush Theme:**
1. Open dashboard
2. Scroll down in sidebar to "Theme"
3. Click "Blush" (soft pink & purple)
4. Meme button now matches the gentle aesthetic

**Blush Theme Colors:**
- Background: Soft lavender (#faf8fc)
- Accent: Soft pink (#d88ec9)
- Text: Deep purple (#5a4a7a)

## Summary

| Feature | Detail |
|---------|--------|
| **Location** | Top-right corner (next to 🔔 bell) |
| **Visible To** | Staff/TA (standard_user) only |
| **All Pages** | Every dashboard page |
| **Icon** | 😊 Smile emoji |
| **Action** | Click = Opens meme modal |
| **Meme Source** | Reddit trending posts (via RapidAPI) |
| **Load Time** | ~500ms per meme |
| **Theme** | Works with all themes |

---

**Still can't find it? Check:**
1. ✅ You're logged in
2. ✅ You're a Staff/TA user
3. ✅ You're on a dashboard page
4. ✅ RapidAPI key is set
5. ✅ Page is fully loaded
6. ✅ Look at TOP-RIGHT corner
