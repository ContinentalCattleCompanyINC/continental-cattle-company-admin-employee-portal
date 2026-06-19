# OFFLINE-FIRST OPERATIONS GUIDE

## Quick Start

The platform now has **automatic offline mode** - no code changes needed! All operations are automatically queued and synced when connectivity is restored.

## Automatic Features

### ✅ What Works Offline (Automatically)

1. **Entity Operations** (Create/Update/Delete)
   - All data saved locally
   - Auto-syncs when online
   - No data loss

2. **Form Submissions**
   - Queued automatically
   - Retries with exponential backoff
   - Success notifications on sync

3. **AI Requests**
   - Falls back to deterministic algorithms
   - NRC equations for feed rations
   - BQA guidelines for health protocols
   - Standard formulas for economics

4. **Page Navigation**
   - Cached pages load instantly
   - Works without internet

### ⚠️ What Requires Internet

- Real-time data sync (auto-retries)
- Email notifications (queued)
- External API calls (queued)
- Live market data (shows cached)

## Visual Indicators

### Offline Status Badge (Bottom-Right)

Shows when you're offline with:
- 🔴 **Red**: Completely offline
- 🟡 **Yellow**: Limited AI/services
- 🟢 **Green**: Syncing queued ops

Click to expand and see:
- Service health status
- Pending operations count
- Manual sync button

### Toast Notifications

- **"Offline Mode"**: You've lost connection
- **"Connection Restored"**: Back online, syncing...
- **"Using data-driven analysis"**: AI unavailable, using fallback

## How It Works

### 1. You Continue Working
```
User fills form → Submits → Saved locally → Confirmation shown
```

### 2. System Queues Operation
```json
{
  "type": "entity_create",
  "entity": "CattleLot",
  "data": { ... },
  "timestamp": 1234567890,
  "retries": 0,
  "nextRetry": 1234567895
}
```

### 3. Auto-Sync When Online
```
Connection detected → Process queue → Sync to backend → Clear queue → Notify success
```

## Retry Schedule

| Attempt | Delay |
|---------|-------|
| 1 | 5 seconds |
| 2 | 10 seconds |
| 3 | 20 seconds |
| 4 | 40 seconds |
| 5 | 80 seconds |
| 6 | 160 seconds |
| 7 | 320 seconds |
| 8 | 640 seconds |
| 9 | 1280 seconds |
| 10 | 2560 seconds (42 min) |

After 10 failures: Marked as "failed" for manual review

## Manual Controls

### Force Sync Now
```javascript
import { forceSync } from '@/lib/offlineEngine';
await forceSync();
```

### Check Queue Status
```javascript
import { getQueueStatus } from '@/lib/offlineEngine';
const status = getQueueStatus();
console.log(status); // { pending: 5, failed: 0, syncing: false }
```

### Check Service Health
```javascript
import { checkServiceHealth } from '@/lib/offlineEngine';
const health = await checkServiceHealth();
console.log(health);
// {
//   internet: { online: true },
//   backend: { online: true },
//   ai: { creditsAvailable: false }
// }
```

## Developer Guide

### Using Offline-Aware Operations

```javascript
import { entityCreate, entityUpdate, aiRequest } from '@/lib/offlineOperations';

// Entity operations (auto-queue when offline)
await entityCreate('CattleLot', {
  breed_type: 'english_beef',
  head_count: 100,
  purchase_weight: 700,
  // ...
});

// AI with fallback
const result = await aiRequest('Generate feed ration', {
  responseJsonSchema: { /* ... */ },
  fallbackFn: async (error) => {
    // Return deterministic result
    return generateRationNRC(data);
  }
});
```

### Best Practices

1. **Always Provide Fallbacks for AI**
   ```javascript
   const plan = await aiRequest(prompt, {
     fallbackFn: () => generateDeterministicPlan(data)
   });
   ```

2. **Use Short Cache TTLs for Dynamic Data**
   ```javascript
   cacheTTL: 60000 // 1 minute for market data
   ```

3. **Handle Offline in UX**
   - Show loading states
   - Display "saved locally" messages
   - Provide manual sync option

4. **Test Offline Mode**
   - Use Chrome DevTools → Network → Offline
   - Verify queue builds correctly
   - Confirm sync on reconnect

## Monitoring

### System Status Dashboard
Visit `/system-status` to see:
- Real-time service health
- Queue status (pending/failed)
- Manual sync trigger
- Failed operation cleanup

### Console Logs
```
[OFFLINE ENGINE] Initialized
[OFFLINE QUEUE] Queued: entity_create (ID: abc123)
[OFFLINE QUEUE] Synced: entity_create (ID: abc123)
[OFFLINE ENGINE] Connection restored
```

## Troubleshooting

### Queue Not Syncing

1. Check System Status dashboard
2. Verify internet connectivity
3. Click "Sync Now" button
4. Review failed operations

### High Failure Count

1. Check error messages in queue
2. Verify data format/permissions
3. Clear failed operations
4. Retry manually

### AI Always Using Fallback

1. Check integration credits (workspace billing)
2. Verify credit reset date
3. Deterministic results are fully functional
4. Upgrade tier for more AI credits

## Storage Limits

- **localStorage**: ~5-10MB per browser
- **Queue**: Stores operation data + metadata
- **Cache**: Temporary results with TTL
- **Auto-cleanup**: On successful sync

### Clear Storage (If Needed)
```javascript
// Clear failed operations only
import { clearFailedOperations } from '@/lib/offlineEngine';
clearFailedOperations();

// Clear all cache
localStorage.clear(); // ⚠️ Use with caution
```

## Mobile Support

✅ Works on all mobile devices:
- iOS Safari
- Android Chrome
- Progressive Web App ready

Touch-optimized:
- Swipe to refresh
- Pull-to-sync gesture
- Mobile-friendly status panel

## Limitations

### Current Limitations

1. **Single Device**: Queue stored per-device/browser
2. **No Background Sync**: Requires app to be open
3. **Storage Limits**: ~5-10MB localStorage
4. **Email Notifications**: Queued but not sent until backend restored

### Future Enhancements

1. **Service Workers**: Full PWA with background sync
2. **IndexedDB**: Larger storage capacity (50-100MB)
3. **Cross-Device Sync**: Queue replication across devices
4. **Push Notifications**: Sync complete alerts

## Examples

### Example 1: Creating Cattle Lot Offline

```javascript
// User fills form and submits
await entityCreate('CattleLot', {
  breed_type: 'english_beef',
  sex: 'steer',
  head_count: 100,
  purchase_weight: 700,
  purchase_price: 150,
});

// Offline: Saved to queue, shows "Saved locally"
// Online: Syncs immediately, shows "Synced successfully"
```

### Example 2: AI Feed Plan with Fallback

```javascript
const plan = await aiRequest(
  'Generate feed ration for 700lb steers, 120 DOF, target 1300lbs',
  {
    responseJsonSchema: feedPlanSchema,
    fallbackFn: async (error) => {
      // Use NRC equations
      return generateNRCFeedPlan({
        startWeight: 700,
        endWeight: 1300,
        days: 120,
      });
    }
  }
);

// Returns AI result if available
// Returns NRC-based result if AI unavailable
```

### Example 3: Market Data with Cache

```javascript
const marketData = await executeWithFallback(
  async () => fetchLiveMarketData(),
  async () => getCachedMarketData(),
  {
    cacheKey: 'market:latest',
    cacheTTL: 300000, // 5 minutes
  }
);

// First call: Fetches from API, caches result
// Offline: Returns cached result (if not expired)
// No cache: Returns fallback data
```

## Summary

✅ **Zero Downtime**: Works during any outage
✅ **No Data Loss**: Everything queued and synced
✅ **Automatic**: No user action required
✅ **Transparent**: Users can continue working
✅ **Resilient**: Handles internet, backend, and AI failures

**The platform is production-ready even with zero connectivity.**