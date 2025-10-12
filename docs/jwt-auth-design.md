# JWT Authentication Architecture Design

## Overview
JWT 토큰 기반 인증 시스템 설계 - 회원가입/로그인을 제외한 모든 API 요청에 자동으로 JWT 토큰을 추가하는 시스템

## Current State Analysis

### Existing Implementation
✅ **Working Components:**
- Token storage: `cookies.ts`에 `setToken()`, `getToken()`, `clearToken()` 구현됨
- Header injection: `apiHelpers.ts:16-17`에서 이미 Authorization 헤더 자동 추가 로직 존재
- Registration flow: `UserRegistration.ts:186-191`에서 token 저장 및 authUser 저장
- Login endpoint: `httpApi.ts:284-292`에 login 메서드 구현됨

⚠️ **Issues Identified:**
1. API endpoint 불일치: `/api/users/{userId}/boards` → `/api/users/me/boards`로 변경 필요
2. Login response handling: boards 응답 구조 처리 필요
3. Token validation: 토큰 만료 시 처리 로직 없음
4. Error handling: 401 Unauthorized 시 자동 로그아웃 필요

## Architecture Design

### 1. Token Management Layer (`utils/tokenManager.ts`)

**Purpose**: JWT 토큰의 생명주기 관리 및 검증

```typescript
// Token validation and lifecycle management
interface TokenManager {
  // Token storage operations (delegates to cookies.ts)
  setToken(token: string): void;
  getToken(): string | null;
  clearToken(): void;

  // Token validation
  isTokenValid(): boolean;
  isTokenExpired(): boolean;

  // Decode token to extract payload
  decodeToken(): TokenPayload | null;

  // Auto-refresh logic (future enhancement)
  scheduleTokenRefresh?(): void;
}

interface TokenPayload {
  userId: string;
  exp: number;
  iat: number;
}
```

**Implementation Notes:**
- JWT 디코딩: Base64 decode를 사용하여 payload 추출
- 만료 검증: `exp` 필드와 현재 시간 비교
- 자동 갱신: 만료 5분 전 자동 갱신 (향후 구현 가능)

### 2. API Client Layer (`api/httpApi.ts` + `utils/apiHelpers.ts`)

**Current State:**
- ✅ `createApiHeaders()`에서 이미 Authorization 헤더 자동 추가 중

**Required Changes:**
1. `/api/users/me/boards` 엔드포인트로 변경
2. 401 에러 발생 시 자동 로그아웃 처리
3. Login 응답의 boards 구조 처리

**Enhanced Error Handling:**
```typescript
// apiHelpers.ts
export async function handleApiResponse<T = any>(response: Response): Promise<T> {
  // 401 Unauthorized → auto logout
  if (response.status === 401) {
    clearAuth();
    showToast('세션이 만료되었습니다. 다시 로그인해주세요.', 'error');
    navigateTo('/');
    throw new Error('Unauthorized');
  }

  // 기존 에러 처리 로직...
}
```

### 3. Authentication State Management

**Current State:**
- ✅ Token: cookie storage (`auth_token`)
- ✅ User: localStorage (`authUser`)
- ✅ Boards: localStorage (`myBoards`)

**State Flow:**

```
Registration Flow:
POST /api/auth/register
  ↓
{ token, user }
  ↓
setToken(token) + setAuthUser(user)
  ↓
Navigate to /boards

Login Flow:
POST /api/auth/login
  ↓
{ token, user, boards: { boards: [...] } }
  ↓
setToken(token) + setAuthUser(user) + setMyBoards(boards.boards)
  ↓
Navigate to /boards

Authenticated API Request:
API Call
  ↓
createApiHeaders() → getToken() → Authorization: Bearer {token}
  ↓
If 401 → clearAuth() → Navigate to /
```

## API Contract Specifications

### Registration Response

```typescript
POST /api/auth/register
Request: {
  userId: string,
  nickname: string,
  color: string
}

Response: {
  token: string,           // JWT token
  user: {
    userId: string,
    nickname: string,
    color: string,
    createdAt: string      // ISO 8601 format
  }
}
```

### Login Response

```typescript
POST /api/auth/login
Request: {
  userId: string
}

Response: {
  token: string,           // JWT token
  user: {
    userId: string,
    nickname: string,
    color: string,
    createdAt: string
  },
  boards: {
    boards: [
      { code: string, title: string }
    ]
  }
}
```

### Authenticated Endpoints

**All endpoints except `/api/auth/*` require:**
```
Authorization: Bearer {token}
```

**Changed Endpoints:**
- ❌ OLD: `GET /api/users/{userId}/boards`
- ✅ NEW: `GET /api/users/me/boards`

## Implementation Roadmap

### Phase 1: Core Token Management ✅ (Mostly Complete)
- [x] Token storage (cookies.ts)
- [x] Authorization header injection (apiHelpers.ts)
- [x] Registration token handling

### Phase 2: API Endpoint Updates (Required)
- [ ] Update `fetchUserBoards()` to use `/api/users/me/boards`
- [ ] Update login handler to process boards response structure
- [ ] Add 401 error handling in `handleApiResponse()`

### Phase 3: Token Validation (Optional Enhancement)
- [ ] Create `tokenManager.ts` for validation logic
- [ ] Implement `isTokenValid()` and `isTokenExpired()`
- [ ] Add token expiration checks before API calls

### Phase 4: User Experience Improvements (Optional)
- [ ] Auto-logout on token expiration
- [ ] Token refresh mechanism
- [ ] Session timeout warnings

## Security Considerations

### Token Storage
- ✅ Using HTTP-only cookies for token storage (implemented)
- ⚠️ XSS protection: Ensure Content Security Policy is configured
- ⚠️ CSRF protection: Consider adding CSRF tokens for state-changing operations

### Token Validation
- Client-side validation: Decode and check `exp` field
- Server-side validation: Backend must validate all tokens
- Token rotation: Implement refresh token mechanism for long-lived sessions

### Error Handling
- 401 Unauthorized → Clear local state + redirect to login
- 403 Forbidden → Show access denied message
- Token tampering → Graceful degradation

## Testing Strategy

### Unit Tests
- Token encoding/decoding
- Expiration validation
- Header injection logic

### Integration Tests
- Registration → Token storage → Authenticated API call
- Login → Token storage → Board list fetch
- Token expiration → 401 → Auto logout
- Invalid token → 401 → Clear state

### E2E Tests
- Complete registration flow
- Complete login flow
- Authenticated board operations
- Session expiration handling

## Migration Notes

### Breaking Changes
- API endpoint change: `/api/users/{userId}/boards` → `/api/users/me/boards`
- All clients must send `Authorization: Bearer {token}` header

### Backwards Compatibility
- Old anonymous board access (via X-Edit-Token) still supported
- Gradual migration path: Support both userId-based and token-based auth temporarily

## Performance Considerations

### Token Size
- JWT tokens are typically 200-500 bytes
- Minimal network overhead for Authorization header

### Validation Performance
- Client-side token validation: < 1ms
- Server-side validation: Backend responsibility

### Caching Strategy
- Token stored in cookie (automatic browser management)
- User data cached in localStorage (fast access)
- Board list cached in localStorage (reduce API calls)

## Future Enhancements

### Token Refresh
- Implement refresh token mechanism
- Auto-refresh before expiration
- Seamless user experience

### Multi-Device Support
- Sync authentication across devices
- Device management UI
- Remote logout capability

### Advanced Security
- Token blacklisting on logout
- IP-based validation
- Rate limiting per token
