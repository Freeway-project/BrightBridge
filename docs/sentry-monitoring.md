# Sentry Error Monitoring Setup

## Current Configuration

**Project:** bright-bridge  
**Organization:** harsh-ic  
**DSN:** `https://d7a146d1e782ff0495b7e127da35c37b@o4506983239647232.ingest.us.sentry.io/4511304953888768`

## What Sentry Captures

### 1. **Errors & Exceptions**
- ✅ Server-side errors (Node.js, Next.js API routes)
- ✅ Client-side errors (Browser JavaScript)
- ✅ Unhandled promise rejections
- ✅ Network failures
- ✅ Database errors
- ✅ API endpoint errors

### 2. **Performance Monitoring**
- ✅ Page load times (10% sampled in production)
- ✅ API response times
- ✅ Database query performance
- ✅ Route transitions
- ✅ Component render times

### 3. **Session Replays**
- ✅ 10% of all sessions recorded
- ✅ 100% of error sessions recorded
- Shows user actions leading to errors
- Helps debug reproduction steps

### 4. **Browser Data**
- ✅ Browser type and version
- ✅ Device type (mobile, desktop)
- ✅ OS and OS version
- ✅ User agent
- ✅ IP address (for geolocation)

### 5. **Application Context**
- ✅ User ID (from OIDC session)
- ✅ Environment (production/staging)
- ✅ Release version
- ✅ Source maps for minified code
- ✅ Request/response headers
- ✅ Environment variables (filtered)

## Sampling Rates

```
Production Environment:
- Error Events: 100% captured
- Performance Traces: 10% sampled
- Session Replays: 10% of sessions, 100% on error

Development Environment:
- All events and traces captured (100%)
```

## What You Can Receive

### 1. **Real-time Notifications**
Sentry can send alerts via:
- **Email** - To configured team members
- **Slack** - Instant channel notifications
- **PagerDuty** - For critical incidents
- **Webhooks** - Custom integrations
- **Discord** - Team notifications

### 2. **Issue Information**
For each error, you receive:
```
- Error type (TypeError, ReferenceError, etc.)
- Error message
- Stack trace with file/line numbers
- Source code context (5 lines before/after)
- Breadcrumbs (user actions that led to error)
- Environment info
- User info (if available)
- Session replay (if captured)
```

### 3. **Performance Insights**
- Slow transaction data
- API endpoint response times
- Frontend/backend breakdown
- Database query times
- Cache hit rates

### 4. **Release Tracking**
- Associate errors with specific releases
- Track if errors are regression (new in this release)
- Compare error rates between versions

## Key Metrics Available

| Metric | Description |
|--------|-------------|
| **Error Count** | Total errors in time period |
| **Error Rate** | Errors per request |
| **Affected Users** | How many users hit the error |
| **First/Last Seen** | When error first/last occurred |
| **Regression** | Is this a new error? |
| **Status** | Resolved/Ignored/Regressed |

## Current Events Being Tracked

### Server-Side
- `/api/*` route errors
- Database query failures
- Authentication errors
- File processing errors

### Client-Side
- Page navigation errors
- Component render errors
- Form submission failures
- Network timeouts
- JavaScript runtime errors

### Already Detected
```
⚠️ listAdminCoursesPage: "failed to parse logic tree"
   - Supabase query parsing error
   - Severity: Error
   - Last seen: 2026-05-20 16:56:00
```

## How to Use the Dashboard

1. **Go to Sentry Dashboard**
   ```
   https://sentry.io/organizations/harsh-ic/projects/bright-bridge/
   ```

2. **View Recent Errors**
   - Click "Issues" to see all errors
   - Click an error to view full details
   - See stack trace, affected users, session replay

3. **Create Alert Rule**
   - Go to Alerts → Create Alert Rule
   - Set condition (e.g., "if error rate > 5%")
   - Choose notification method (Slack, Email, etc.)
   - Set frequency (real-time, hourly, etc.)

4. **View Performance**
   - Click "Performance" tab
   - See slowest transactions
   - Identify bottlenecks

5. **Release Tracking**
   - Tag errors with release version
   - Compare error rates between versions
   - Identify regressions

## Setting Up Alerts

### Critical Error Alert
```
Condition: Error event
Frequency: Real-time
Action: Slack notification + Email
```

### High Error Rate
```
Condition: Error count > 100 in 5 minutes
Frequency: Every 5 minutes
Action: Slack + Escalate to PagerDuty
```

### Performance Degradation
```
Condition: Transaction duration > 5 seconds
Frequency: Every 10 minutes
Action: Email notification
```

## Data Retention

- **Error Events:** 90 days
- **Session Replays:** 30 days
- **Performance Data:** 30 days
- **Release History:** 90 days

## Privacy & Filtering

Sentry automatically filters:
- Passwords and credentials
- Credit card numbers
- API keys
- Personal user data (PII)

Additional filters can be configured in project settings.

## Integration with PM2

The PM2 error-alert script complements Sentry by:
- Checking process health in real-time
- Validating app responsiveness
- Triggering immediate alerts before Sentry processes events
- Providing quick notifications for critical failures

## Next Steps

1. ✅ Sentry configured
2. ⏳ Set up alert rules in Sentry dashboard
3. ⏳ Connect Slack workspace for notifications
4. ⏳ Add team members to Sentry organization
5. ⏳ Review and tune sampling rates as needed

## Useful Links

- **Sentry Dashboard:** https://sentry.io/organizations/harsh-ic/projects/bright-bridge/
- **Sentry Docs:** https://docs.sentry.io/product/
- **Next.js Integration:** https://docs.sentry.io/platforms/javascript/guides/nextjs/
