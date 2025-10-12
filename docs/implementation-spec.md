# JWT Authentication Implementation Specification

## Implementation Summary

### Required Changes

#### 1. API Endpoint Update (`src/api/httpApi.ts`)

**File:** `src/api/httpApi.ts:241-257`

**Change:**
```typescript
// BEFORE (Line 242)
async fetchUserBoards(userId: string): Promise<Array<{ boardCode: string; title: string }>> {
  const response = await fetch(`${BASE_URL}/users/${userId}/boards`, {
    method: 'GET',
    headers: createApiHeaders(),
  });
  // ...
}

// AFTER
async fetchUserBoards(): Promise<Array<{ boardCode: string; title: string }>> {
  const response = await fetch(`${BASE_URL}/users/me/boards`, {
    method: 'GET',
    headers: createApiHeaders(),
  });
  // ...
}
```

**Rationale:**
- Removes `userId` parameter (extracted from JWT token on backend)
- Changes endpoint from `/api/users/{userId}/boards` to `/api/users/me/boards`
- Token automatically included via `createApiHeaders()` (already implemented)

---

#### 2. Login Response Handling (`src/api/httpApi.ts`)

**File:** `src/api/httpApi.ts:284-292`

**Current Implementation:**
```typescript
async login(userId: string): Promise<{
  token: string;
  user: any;
  boards: { boards: Array<{ code: string; title: string }> }
}> {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: createApiHeaders(true),
    body: JSON.stringify({ userId }),
  });
  const data = await handleApiResponse(response);
  return data;
}
```

**Status:** ✅ Already correct - matches server response structure

**Usage Example:**
```typescript
const { token, user, boards } = await api.login(userId);
setToken(token);
setAuthUser(user);
setMyBoards(boards.boards); // Access nested boards array
```

---

#### 3. 401 Error Handling (`src/utils/apiHelpers.ts`)

**File:** `src/utils/apiHelpers.ts:38-60`

**Enhancement:**
```typescript
// ADD IMPORT at top
import { clearAuth } from './cookies';
import { navigateTo } from './navigation';
import { showToast } from './domHelpers';

export async function handleApiResponse<T = any>(response: Response): Promise<T> {
  // ADD THIS BLOCK BEFORE existing error handling
  if (response.status === 401) {
    clearAuth();
    showToast('세션이 만료되었습니다. 다시 로그인해주세요.', 'error');
    navigateTo('/');
    throw new Error('Unauthorized - session expired');
  }

  // Existing error handling...
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    // ... rest of existing code
  }

  // Existing return logic...
}
```

**Rationale:**
- Automatically logout user on 401 responses
- Clear all authentication state
- Redirect to login page
- Show user-friendly error message

---

#### 4. Token Validation Helper (Optional Enhancement)

**New File:** `src/utils/tokenManager.ts`

```typescript
import { getToken, clearAuth } from './cookies';

export interface TokenPayload {
  userId: string;
  exp: number;  // Expiration timestamp (seconds since epoch)
  iat: number;  // Issued at timestamp
}

/**
 * Decodes JWT token payload (does not verify signature)
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = JSON.parse(atob(payload));

    return {
      userId: decoded.userId,
      exp: decoded.exp,
      iat: decoded.iat,
    };
  } catch (error) {
    console.error('[TokenManager] Failed to decode token:', error);
    return null;
  }
}

/**
 * Checks if current token is expired
 */
export function isTokenExpired(): boolean {
  const token = getToken();
  if (!token) return true;

  const payload = decodeToken(token);
  if (!payload) return true;

  const now = Math.floor(Date.now() / 1000);
  return now >= payload.exp;
}

/**
 * Validates token and clears auth if expired
 */
export function validateToken(): boolean {
  if (isTokenExpired()) {
    clearAuth();
    return false;
  }
  return true;
}

/**
 * Gets user ID from token
 */
export function getUserIdFromToken(): string | null {
  const token = getToken();
  if (!token) return null;

  const payload = decodeToken(token);
  return payload?.userId || null;
}
```

**Usage:**
```typescript
// Before making authenticated API calls
import { validateToken } from '../utils/tokenManager';

if (!validateToken()) {
  navigateTo('/');
  return;
}

// Proceed with API call...
```

---

## Component Updates

### 5. ParticipantLogin Component Update

**File:** `src/components/ParticipantLogin.ts`

**Required Changes:**
- Update login handler to save boards from response

```typescript
// In handleLogin method (around line 80-100)
try {
  const { token, user, boards } = await api.login(userId);

  setToken(token);
  setUserId(user.userId);
  setAuthUser(user);
  setMyBoards(boards.boards); // ADD THIS LINE

  showToast('로그인 성공!', 'success');
  setTimeout(() => navigateTo('/boards'), 500);
} catch (error) {
  // error handling...
}
```

---

### 6. BoardList Component Update

**File:** `src/components/BoardList.ts`

**Required Changes:**
- Remove `userId` parameter from `fetchUserBoards()` call

```typescript
// BEFORE
const boards = await api.fetchUserBoards(userId);

// AFTER
const boards = await api.fetchUserBoards();
```

**Location:** Search for `fetchUserBoards` calls in the component

---

## Testing Checklist

### Registration Flow
- [ ] User registers with userId, nickname, color
- [ ] Receives token and user object
- [ ] Token saved to cookie
- [ ] User saved to localStorage
- [ ] Redirects to /boards
- [ ] Subsequent API calls include Authorization header

### Login Flow
- [ ] User logs in with userId
- [ ] Receives token, user, and boards
- [ ] Token saved to cookie
- [ ] User and boards saved to localStorage
- [ ] Redirects to /boards
- [ ] Board list displays correctly

### Authenticated API Calls
- [ ] All non-auth endpoints receive Authorization header
- [ ] Board operations work correctly
- [ ] Chore CRUD operations work correctly
- [ ] fetchUserBoards uses /api/users/me/boards

### Error Handling
- [ ] Invalid token → 401 → auto logout → redirect to /
- [ ] Expired token → 401 → auto logout → redirect to /
- [ ] Missing token → API call fails → appropriate error message

### Token Validation (Optional)
- [ ] `isTokenExpired()` correctly detects expired tokens
- [ ] `decodeToken()` extracts userId from token
- [ ] `validateToken()` prevents API calls with invalid tokens

---

## Migration Steps

### Step 1: Update API Client
1. Modify `fetchUserBoards()` in `httpApi.ts`
2. Remove `userId` parameter
3. Change endpoint to `/api/users/me/boards`

### Step 2: Enhance Error Handling
1. Add imports to `apiHelpers.ts`
2. Add 401 handling in `handleApiResponse()`
3. Test logout flow

### Step 3: Update Components
1. Update `ParticipantLogin.ts` to save boards
2. Update `BoardList.ts` to call `fetchUserBoards()` without userId
3. Test login → board list flow

### Step 4: Optional Enhancements
1. Create `tokenManager.ts`
2. Add token validation before critical operations
3. Implement token expiration warnings

---

## Rollback Plan

### If Issues Arise
1. Revert `fetchUserBoards()` to accept `userId` parameter
2. Temporarily support both `/api/users/{userId}/boards` and `/api/users/me/boards`
3. Remove 401 auto-logout if causing issues
4. Coordinate with backend team for temporary backwards compatibility

### Backwards Compatibility
- Keep old endpoint available for 1-2 weeks
- Support both authenticated and userId-based access
- Gradually migrate users to new system

---

## Performance Impact

### Expected Changes
- ✅ No performance degradation
- ✅ Authorization header: ~50-100 bytes per request
- ✅ Token validation: < 1ms client-side

### Monitoring
- Track 401 error rates
- Monitor login success rates
- Check average API response times

---

## Security Improvements

### Before
- User ID passed as path parameter
- Any authenticated user could access any user's boards

### After
- User ID extracted from JWT token on backend
- Users can only access their own boards
- Token-based authorization prevents impersonation

---

## Documentation Updates Required

### API Documentation
- Update endpoint documentation: `/api/users/me/boards`
- Add authentication requirements section
- Document token format and expiration

### User Documentation
- Session timeout behavior
- Auto-logout on token expiration
- Login required for board access

---

## Success Criteria

### Must Have
- ✅ All API calls include Authorization header (except /auth/*)
- ✅ fetchUserBoards uses /api/users/me/boards
- ✅ 401 errors trigger automatic logout
- ✅ Registration and login flows work correctly

### Nice to Have
- ✅ Token validation before API calls
- ✅ Token expiration warnings
- ✅ Graceful session timeout handling

### Testing Targets
- 100% success rate for registration flow
- 100% success rate for login flow
- 100% success rate for authenticated API calls
- 0 security vulnerabilities in token handling
