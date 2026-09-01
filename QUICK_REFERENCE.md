# Quick Reference - Supabase Caching System

## 🚀 Quick Start

### Use Cached Queries in Components
```typescript
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { cachedSurvivalService } from '@/lib/services/survivalService';

export function MyComponent() {
  const { data, loading, error, refetch } = useCachedQuery(
    'exam-centers',
    () => cachedSurvivalService.getExamCenters(),
    [] // dependency array
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{data?.length} centers</div>;
}
```

### Get Auth Without Repeated Calls
```typescript
import { authManager } from '@/lib/authManager';

// Call once at app startup (in AuthProvider)
await authManager.initialize();

// Then use anywhere, anytime (sync, no API calls)
const userId = authManager.getUserId();
const isAuthenticated = authManager.isAuthenticated();
```

### Fetch with Parameters
```typescript
const { data: housing } = useCachedQuery(
  `housing-${centerId}`, // Include params in cache key
  () => cachedSurvivalService.getHousing({ centerId }),
  [centerId] // Refetch when centerId changes
);
```

### Trigger Refetch After Update
```typescript
const handleSave = async (formData) => {
  await cachedSurvivalService.addExamCenter(formData);
  setTriggerRefresh(prev => prev + 1); // Invalidates and refetches
};

const { data, refetch } = useCachedQuery(
  'exam-centers',
  () => cachedSurvivalService.getExamCenters(),
  [triggerRefresh]
);
```

## 📚 Import Cheatsheet

```typescript
// Caching layer
import { queryCache, makeCacheKey } from '@/lib/queryCache';

// Auth management
import { authManager } from '@/lib/authManager';

// Request batching (optional)
import { batchedCall, requestBatcher } from '@/lib/requestBatcher';

// React hooks
import { useCachedQuery, useCachedQueryAdvanced } from '@/hooks/useCachedQuery';

// Wrapped API (use this, not survivalApi)
import { cachedSurvivalService } from '@/lib/services/survivalService';
```

## 🎯 Common Patterns

### Pattern 1: Simple Data Fetch
```typescript
const { data, loading } = useCachedQuery(
  'key',
  () => cachedSurvivalService.getExamCenters(),
  []
);
```

### Pattern 2: Parameterized Query
```typescript
const { data } = useCachedQuery(
  `housing-${centerId}`,
  () => cachedSurvivalService.getHousing({ centerId }),
  [centerId]
);
```

### Pattern 3: Multiple Queries
```typescript
const { data: centers } = useCachedQuery('centers', () => cachedSurvivalService.getExamCenters(), []);
const { data: housing } = useCachedQuery('housing', () => cachedSurvivalService.getHousing(), []);
// Both use cache, no redundant API calls
```

### Pattern 4: With Error Handling
```typescript
const { data, error, refetch } = useCachedQuery(
  'key',
  () => cachedSurvivalService.getExamCenters(),
  [],
  {
    onError: (err) => console.error('Failed:', err),
    onSuccess: (data) => console.log('Got:', data)
  }
);
```

### Pattern 5: Advanced with Retry
```typescript
const { data, invalidate, getCached } = useCachedQueryAdvanced(
  'key',
  () => fetchData(),
  {
    retry: 3,
    retryDelay: 1000,
    forceRefresh: false
  }
);

// Manually invalidate and refetch
await invalidate();

// Get cached value without fetching
const cached = getCached();
```

## 🔧 API Methods (All Cached)

### Exam Centers
```typescript
cachedSurvivalService.getExamCenters()
cachedSurvivalService.addExamCenter(data)
cachedSurvivalService.updateExamCenter(id, data)
cachedSurvivalService.deleteExamCenter(id)
```

### Housing
```typescript
cachedSurvivalService.getHousing(params)
cachedSurvivalService.createHousing(formData)
cachedSurvivalService.deleteHousing(houseId)
```

### Hospitals
```typescript
cachedSurvivalService.getHospitals(params)
cachedSurvivalService.addHospital(data)
cachedSurvivalService.updateHospital(id, data)
cachedSurvivalService.deleteHospital(id)
```

### Placements
```typescript
cachedSurvivalService.getPlacements()
cachedSurvivalService.createPlacementSite(formData)
cachedSurvivalService.deletePlacement(id)
```

### Reviews
```typescript
cachedSurvivalService.getReviews(targetId)
cachedSurvivalService.addReview(reviewData)
```

### Exam Buddies
```typescript
cachedSurvivalService.getExamBuddies(centerId)
cachedSurvivalService.joinExamCenter(details)
cachedSurvivalService.leaveExamCenter(centerId)
```

### Dashboard
```typescript
cachedSurvivalService.getDashboardStats()
cachedSurvivalService.getAllHospitals()
cachedSurvivalService.getAllPlacementSites()
```

## 🧹 Cache Management

### Clear Specific Cache
```typescript
queryCache.invalidate('exam-centers');
```

### Clear by Prefix
```typescript
queryCache.invalidateByPrefix('survivalApi:getExamCenters');
```

### Clear All
```typescript
queryCache.clear();
```

### View Cache Stats
```typescript
console.log(queryCache.getStats());
// { cacheSize: 5, inflightRequests: 0, entries: [...] }
```

## 🔐 Auth Management

### Initialize (Once at App Start)
```typescript
import { authManager } from '@/lib/authManager';

useEffect(() => {
  authManager.initialize(); // Called in AuthProvider
}, []);
```

### Get User Data (Sync, No API Calls)
```typescript
const userId = authManager.getUserId();
const user = authManager.getUser();
const session = authManager.getSession();
const isAuth = authManager.isAuthenticated();
const isLoading = authManager.isLoading();
```

### Subscribe to Auth Changes
```typescript
const unsubscribe = authManager.subscribe((state) => {
  console.log('Auth state:', state);
  // { user, session, loading }
});

// Clean up when done
unsubscribe();
```

## ⏱️ TTL Configuration

| Data Type | TTL | Use Case |
|-----------|-----|----------|
| STATIC (5m) | Exam centers, hospitals, placements | Infrequently changing |
| USER_DATA (2m) | Housing, reviews | User-specific content |
| REAL_TIME (30s) | Exam buddies, online status | Frequently changing |
| SINGLE (3m) | Single entity queries | Individual record |

## 📊 Performance Tips

1. **Use cache keys for dependent data**
   ```typescript
   `housing-${centerId}` // Different cache per center
   ```

2. **Batch multiple fetches**
   ```typescript
   await Promise.all([
     useCachedQuery(...),
     useCachedQuery(...),
     useCachedQuery(...),
   ]);
   ```

3. **Set appropriate TTLs**
   - 5m for static data
   - 2m for user data
   - 30s for real-time data

4. **Invalidate related caches**
   ```typescript
   // After deleting housing, also invalidate stats
   await cachedSurvivalService.deleteHousing(id);
   queryCache.invalidateByPrefix('survivalApi:getDashboardStats');
   ```

## 🐛 Debugging

### Check What's Cached
```typescript
console.log(queryCache.getStats());
```

### Monitor Auth State
```typescript
console.log({
  user: authManager.getUser(),
  isAuth: authManager.isAuthenticated(),
  loading: authManager.isLoading()
});
```

### Force Fresh Data
```typescript
queryCache.invalidate('exam-centers');
refetch(); // From useCachedQuery hook
```

### Check In-Flight Requests
```typescript
const stats = queryCache.getStats();
console.log(`In-flight requests: ${stats.inflightRequests}`);
```

##  Migration Checklist

- [ ] Replaced `survivalApi` with `cachedSurvivalService`
- [ ] Using `useCachedQuery` hook instead of manual `useEffect`
- [ ] Using `authManager` instead of `supabase.auth.getUser()`
- [ ] Set up proper dependency arrays
- [ ] Added cache invalidation on mutations
- [ ] Tested cache hit rates
- [ ] Verified no auth lock errors
- [ ] Monitored Supabase usage reduction

## 📞 Support

- **Documentation**: See `CACHING_GUIDE.md`
- **Examples**: Check updated components in survival-hub
- **Debugging**: Use `queryCache.getStats()` and `authManager` methods

---

**Remember**: Cache invalidation is one of the hardest problems in computer science. When in doubt, use `queryCache.clear()` to start fresh! 😄
