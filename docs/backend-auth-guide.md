# 백엔드 API - HttpOnly 쿠키 인증 가이드

## 1. 개요

이 문서는 프론트엔드와의 원활한 인증 연동을 위해 백엔드 API가 따라야 할 `HttpOnly` 쿠키 기반 인증 요구사항을 정의합니다. 프론트엔드는 모든 API 요청에 `credentials: 'include'` 옵션을 사용하여 브라우저가 인증 쿠키를 자동으로 전송하도록 설정되어 있습니다.

## 2. 핵심 요구사항

백엔드는 다음 3가지 핵심 로직을 구현해야 합니다.

### 가. 로그인 / 회원가입: `Set-Cookie` 헤더로 쿠키 발급

-   **Endpoint**: `POST /api/auth/login`, `POST /api/auth/register`
-   **Action**: 사용자 인증 성공 시, 응답 헤더에 `Set-Cookie`를 포함하여 JWT 토큰을 발급해야 합니다.
-   **중요**: 보안을 위해 응답 **본문(body)에 토큰을 포함해서는 안 됩니다.**

#### `Set-Cookie` 헤더 명세

쿠키는 다음 속성을 **반드시** 포함해야 합니다.

-   `HttpOnly`: JavaScript에서 쿠키에 접근하는 것을 막아 XSS 공격을 방어합니다.
-   `Secure`: HTTPS 환경에서만 쿠키가 전송되도록 합니다. (개발 환경에서는 `false`로 설정할 수 있습니다.)
-   `SameSite=Strict` 또는 `SameSite=Lax`: CSRF 공격을 방어합니다. `Strict`를 권장합니다.
-   `Path=/`: 사이트의 모든 경로에서 쿠키가 유효하도록 설정합니다.
-   `Max-Age` 또는 `Expires`: 쿠키의 만료 시간을 설정합니다. (예: `Max-Age=86400` for 24 hours)

**예시 `Set-Cookie` 헤더:**
```http
Set-Cookie: chores_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400
```

#### 응답 본문(Body) 명세

-   로그인/회원가입 응답 본문에서는 `token` 필드를 **제거**해야 합니다.

**Login (`POST /api/auth/login`) 응답 예시:**
```json
// Correct Response (token 필드 없음)
{
  "user": {
    "userId": "testuser",
    "nickname": "Test User",
    "color": "#FFFFFF",
    "createdAt": "2025-10-10T10:00:00Z"
  },
  "boards": {
    "boards": [
      { "code": "board1", "title": "My First Board" }
    ]
  }
}
```

### 나. 모든 인증된 요청: 쿠키에서 토큰 검증

-   **Endpoint**: `/api/auth/*`를 제외한 모든 API 엔드포인트
-   **Action**: 프론트엔드에서 `credentials: 'include'` 옵션으로 인해 자동으로 전송된 요청의 쿠키 헤더에서 `chores_token`(또는 설정된 쿠키 이름)을 읽어 JWT를 검증하고 사용자를 인가해야 합니다.
-   프론트엔드는 `Authorization: Bearer ...` 헤더를 보내지 않습니다.

### 다. 로그아웃: 쿠키 삭제

-   **Endpoint**: `POST /api/auth/logout`
-   **Action**: 해당 쿠키를 즉시 만료시켜 삭제하는 `Set-Cookie` 헤더를 전송해야 합니다.

**예시 `Set-Cookie` 헤더 (로그아웃 시):**
```http
Set-Cookie: chores_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0
```

## 3. CORS 설정

`credentials: 'include'` 옵션을 사용하는 프론트엔드와 통신하려면, 백엔드의 CORS 설정에 다음 두 가지가 반드시 포함되어야 합니다.

1.  `Access-Control-Allow-Origin`: 프론트엔드 도메인(예: `http://localhost:5173`)을 명시적으로 지정해야 합니다. 와일드카드(`*`)는 사용할 수 없습니다.
2.  `Access-Control-Allow-Credentials`: `true`로 설정해야 합니다.

**Node.js Express `cors` 미들웨어 예시:**
```javascript
const cors = require('cors');

app.use(cors({
  origin: 'http://localhost:5173', // 프론트엔드 주소
  credentials: true
}));
```

## 4. 요약: 백엔드 체크리스트

-   [ ] **로그인/회원가입**: `Set-Cookie` 헤더로 `HttpOnly`, `Secure`, `SameSite` 속성을 포함한 쿠키를 발급하는가?
-   [ ] **로그인/회원가입**: 응답 본문에서 `token` 필드를 제거했는가?
-   [ ] **API 인증**: `Authorization` 헤더가 아닌, 요청에 담긴 쿠키에서 토큰을 읽어 검증하는가?
-   [ ] **로그아웃**: `Max-Age=0`으로 쿠키를 삭제하는 `Set-Cookie` 헤더를 응답하는가?
-   [ ] **CORS**: `Access-Control-Allow-Origin`에 프론트엔드 주소를 명시하고, `Access-Control-Allow-Credentials`를 `true`로 설정했는가?
