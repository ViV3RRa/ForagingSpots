# Potential Bugs & Edge Cases: Offline Solution

This document analyzes the offline-first implementation for the ForagingSpots PWA.

## Critical (High Priority)

### 1. navigator.onLine is unreliable
**Rating: 8/10** | **Location:** `src/hooks/useForagingSpots.ts:73`

```typescript
if (navigator.onLine) {
  return foragingSpotsApi.create(newSpot);
}
```

**Issue:** `navigator.onLine` can return `true` even when there's no actual internet connectivity (e.g., connected to WiFi but no internet). If the API call fails due to network issues, the error handler shows a generic error but the data is **lost** - not saved to IndexedDB.

**Impact:** User loses their data silently.

**Fix:** Wrap API call in try-catch and fall back to offline storage on network errors.

---

### 2. No retry mechanism for failed syncs
**Rating: 7/10** | **Location:** `src/hooks/usePendingSpots.ts:131-134`

```typescript
} catch (error) {
  console.error(`Failed to sync spot ${spot.localId}:`, error);
  failed++;
}
```

**Issue:** If sync fails (e.g., server error, validation error), the spot stays in IndexedDB forever with no indication to the user. No retry logic, no error state stored.

**Impact:** Data gets stuck; user doesn't know why sync failed or how to fix it.

**Fix:** Store `_syncError` on failed spots, implement exponential backoff retry, show error UI.

---

### 3. Duplicate spots after sync (race condition)
**Rating: 7/10** | **Location:** `src/App.tsx:44-50`

```typescript
useEffect(() => {
  if (navigator.onLine && isAuthenticated && pendingSpots.length > 0) {
    syncPendingSpots().then(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.foragingSpots.all });
    });
  }
}, [isAuthenticated, pendingSpots.length, syncPendingSpots, queryClient]);
```

**Issue:** This effect runs when `pendingSpots.length` changes. During sync, if `pendingSpots.length` changes mid-sync (spots being removed), it could trigger another sync. Also, `handleOnline` callback in line 32-38 could run simultaneously.

**Impact:** Potential duplicate API calls, duplicate spots on server.

**Fix:** Add a `isSyncing` guard at the App level, or use a ref to track sync state.

---

## Moderate (Medium Priority)

### 4. Server spots can't be edited/deleted offline
**Rating: 6/10** | **Location:** `src/hooks/useForagingSpots.ts:148-149`

```typescript
// Server spot - use API
return foragingSpotsApi.update(id, data);
```

**Issue:** If user tries to update a server spot while offline, it will fail. Currently disabled in UI via `isEditDisabled`, but this limits functionality.

**Impact:** Users can only edit pending spots offline, not previously synced spots.

**Fix:** Queue server spot updates/deletes for later sync (more complex offline-first architecture).

---

### 5. Optimistic update rollback doesn't work for pending spots
**Rating: 5/10** | **Location:** `src/hooks/useForagingSpots.ts:160-167`

```typescript
if (previousSpots) {
  const updatedSpots = previousSpots.map(spot =>
    spot.id === id ? { ...spot, ...data } : spot
  );
  queryClient.setQueryData<ForagingSpot[]>(queryKeys.foragingSpots.all, updatedSpots);
}
```

**Issue:** The `onMutate` optimistic update operates on `queryKeys.foragingSpots.all`, but pending spots come from `pendingSpotsQueryKey`. The rollback on error won't restore pending spot state correctly.

**Impact:** UI inconsistency if pending spot update fails.

**Fix:** Skip optimistic updates for pending spots or add pending spot rollback logic.

---

### 6. Object URL memory leaks
**Rating: 5/10** | **Location:** `src/hooks/usePendingSpots.ts:63`

```typescript
return images.map(img => URL.createObjectURL(img.blob));
```

**Issue:** `URL.createObjectURL` creates object URLs that need to be revoked with `URL.revokeObjectURL()`. These are never cleaned up.

**Impact:** Memory leak, especially with many images.

**Fix:** Return cleanup function or manage URLs in component with useEffect cleanup.

---

### 7. User ID mismatch for pending spots
**Rating: 4/10** | **Location:** `src/hooks/useForagingSpots.ts:90`, `src/hooks/usePendingSpots.ts:144`

```typescript
user: 'current-user',
```

**Issue:** Pending spots use hardcoded `'current-user'` string instead of actual user ID. This could cause issues with ownership checks.

**Impact:** Ownership logic may not work correctly for pending spots.

**Fix:** Pass actual user ID when creating pending spots.

---

### 8. IndexedDB operations not atomic
**Rating: 4/10** | **Location:** `src/hooks/usePendingSpots.ts:33-44`

```typescript
await offlineDb.pendingSpots.add(pendingSpot);
for (const file of params.images) {
  await offlineDb.pendingImages.add(pendingImage);
}
```

**Issue:** Spot and images are added in separate operations. If the app crashes mid-operation, orphaned images could exist.

**Impact:** Data inconsistency in IndexedDB.

**Fix:** Use Dexie transactions:
```typescript
offlineDb.transaction('rw', offlineDb.pendingSpots, offlineDb.pendingImages, async () => {
  // ... atomic operations
})
```

---

## Minor (Low Priority)

### 9. Pending count staleness
**Rating: 3/10** | **Location:** `src/components/OfflineBanner.tsx:18-21`

**Issue:** The banner shows pending count, but this relies on the query being up-to-date. If query hasn't refetched, count may be stale.

**Impact:** Minor UX issue - count might not update immediately.

---

### 10. Brief visual duplication after sync
**Rating: 3/10** | **Location:** `src/App.tsx:34-36`

```typescript
await syncPendingSpots();
queryClient.invalidateQueries({ queryKey: queryKeys.foragingSpots.all });
```

**Issue:** After sync, server spots are invalidated, but this triggers a new fetch. During that fetch, the newly synced spots appear both in server response AND might briefly still appear as pending (race condition with pending spots query invalidation).

**Impact:** Brief visual duplication possible.

---

### 11. No conflict resolution
**Rating: 3/10**

**Issue:** If the same spot is edited both offline and on another device, there's no conflict detection or resolution.

**Impact:** Last-write-wins, data could be lost.

**Fix:** Would need server-side conflict detection (complex).

---

### 12. Console.log statements in production
**Rating: 2/10** | **Location:** `src/lib/api.ts:17, 21-24`

**Issue:** Debug console.log statements left in production code.

**Impact:** Console noise, minor performance.

---

## Summary Table

| # | Issue | Severity | Likelihood | Rating |
|---|-------|----------|------------|--------|
| 1 | navigator.onLine unreliable | High | Medium | 8/10 |
| 2 | No retry for failed syncs | High | High | 7/10 |
| 3 | Duplicate spots race condition | High | Low | 7/10 |
| 4 | Server spots not editable offline | Medium | High | 6/10 |
| 5 | Optimistic update rollback broken | Medium | Low | 5/10 |
| 6 | Object URL memory leaks | Medium | Medium | 5/10 |
| 7 | User ID mismatch | Medium | Low | 4/10 |
| 8 | Non-atomic IndexedDB operations | Medium | Low | 4/10 |
| 9 | Pending count staleness | Low | Low | 3/10 |
| 10 | Brief visual duplication | Low | Low | 3/10 |
| 11 | No conflict resolution | Low | Low | 3/10 |
| 12 | Console.log in production | Low | High | 2/10 |
