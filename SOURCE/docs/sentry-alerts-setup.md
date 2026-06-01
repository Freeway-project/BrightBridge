# Sentry Error Monitoring & Alerts Setup

## Current Configuration

**Sentry Project:** bright-bridge  
**Organization:** harsh-ic  
**DSN:** `https://d7a146d1e782ff0495b7e127da35c37b@o4506983239647232.ingest.us.sentry.io/4511304953888768`

## Alert Rules to Configure

Go to [Sentry Dashboard](https://sentry.io/organizations/harsh-ic/projects/bright-bridge/alerts/) and create these alert rules:

### 1. **Critical Errors Alert**
- **Condition:** Error rate > 5 errors/min OR any `Error` level event
- **Actions:** 
  - Send email notification to team
  - Create Slack notification (#alerts channel)
- **Frequency:** Real-time

### 2. **High Error Rate Alert**
- **Condition:** Error rate > 50% of events
- **Actions:** 
  - Slack notification
  - Email alert
- **Frequency:** Every 5 minutes

### 3. **Unhandled Exception Alert**
- **Condition:** Any unhandled exception in Next.js
- **Actions:** 
  - Slack notification
  - PagerDuty (if available)
- **Frequency:** Real-time

### 4. **Database Query Errors**
- **Condition:** Error matches "failed to parse logic tree" OR "listAdminCoursesPage"
- **Actions:** 
  - Email to database team
  - Slack notification
- **Frequency:** Real-time

### 5. **API Errors Alert**
- **Condition:** Error from `/api/*` routes
- **Actions:** 
  - Slack notification
  - Email alert
- **Frequency:** Every 1 minute

## How to Create Alert Rules

1. Go to **Sentry** → Select **bright-bridge** project
2. Click **Alerts** → **Create Alert Rule**
3. Set condition (e.g., "If error event")
4. Set action (Slack, email, webhook)
5. Set frequency (real-time, 1 min, 5 min, etc.)
6. Save alert

## Slack Integration

To enable Slack alerts:
1. In Sentry, go to **Settings** → **Integrations**
2. Click **Slack** (or find it in integrations list)
3. Install Slack app for your workspace
4. Grant permissions
5. Select channel for notifications (e.g., #alerts)

## Email Integration

Emails are sent to:
- Project admins by default
- Add custom emails in **Settings** → **Notifications**

## Monitoring Dashboard

**Current errors to watch:**
```
⚠️ listAdminCoursesPage: failed to parse logic tree
   - Supabase query error
   - Monitor for pattern
```

## Production Monitoring

For PM2 integration:
```bash
# Check PM2 logs for errors
pm2 logs brightbridge

# Monitor in real-time
pm2 monitor
```

## Best Practices

✅ Set up at least 2 alert channels (email + Slack)  
✅ Test alerts after configuration  
✅ Review alert fatigue (too many false positives)  
✅ Set appropriate severity levels  
✅ Keep Sentry org admin notified
