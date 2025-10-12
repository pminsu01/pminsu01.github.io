# 서버 측 구현 가이드 - localStorage + Authorization Header

Safari ITP 문제 해결을 위한 인증 시스템 마이그레이션 가이드

## 🎯 변경 사항 요약

### Before (HttpOnly Cookie)
```
클라이언트: credentials: 'include'로 쿠키 자동 전송
서버: Set-Cookie 헤더로 JWT 쿠키 전송
문제: Safari ITP가 cross-site 쿠키 차단
```

### After (localStorage + Bearer Token)
```
클라이언트: Authorization: Bearer {token} 헤더 전송
서버: 응답 Body에 JWT 토큰 포함
해결: 모든 브라우저에서 동일하게 작동
```

---

## 📝 서버 코드 수정 사항

### 1. 로그인 응답 수정

#### Before (Cookie 방식)
```kotlin
// AuthController.kt
@PostMapping("/auth/login")
fun login(@RequestBody request: LoginRequest, response: HttpServletResponse): LoginResponse {
    val user = userService.findByUserId(request.userId)
        ?: throw UserNotFoundException()

    // JWT 생성
    val token = jwtService.generateToken(user.userId)

    // HttpOnly Cookie 설정 ❌
    val cookie = cookieUtil.createJwtCookie(token)
    response.addCookie(cookie)

    // 응답에는 토큰 없음 ❌
    return LoginResponse(
        user = user,
        boards = boardService.getUserBoards(user.userId)
    )
}
```

#### After (Bearer Token 방식)
```kotlin
// AuthController.kt
@PostMapping("/auth/login")
fun login(@RequestBody request: LoginRequest): LoginResponse {
    val user = userService.findByUserId(request.userId)
        ?: throw UserNotFoundException()

    // JWT 생성
    val token = jwtService.generateToken(user.userId)

    // 쿠키 설정 제거 ✅

    // 응답 Body에 토큰 포함 ✅
    return LoginResponse(
        token = token,  // ← 추가
        user = user,
        boards = boardService.getUserBoards(user.userId)
    )
}
```

**응답 DTO 수정**:
```kotlin
data class LoginResponse(
    val token: String,  // ← 추가
    val user: UserDto,
    val boards: UserBoardsDto
)
```

---

### 2. 회원가입 응답 수정

#### Before
```kotlin
@PostMapping("/auth/register")
fun register(@RequestBody request: RegisterRequest, response: HttpServletResponse): RegisterResponse {
    val user = userService.registerUser(request)
    val token = jwtService.generateToken(user.userId)

    // HttpOnly Cookie 설정 ❌
    val cookie = cookieUtil.createJwtCookie(token)
    response.addCookie(cookie)

    return RegisterResponse(
        user = user
    )
}
```

#### After
```kotlin
@PostMapping("/auth/register")
fun register(@RequestBody request: RegisterRequest): RegisterResponse {
    val user = userService.registerUser(request)
    val token = jwtService.generateToken(user.userId)

    // 쿠키 설정 제거 ✅

    // 응답 Body에 토큰 포함 ✅
    return RegisterResponse(
        token = token,  // ← 추가
        user = user
    )
}
```

---

### 3. JWT 인증 필터 수정

#### Before (Cookie에서 토큰 추출)
```kotlin
// JwtAuthenticationFilter.kt
class JwtAuthenticationFilter(
    private val jwtService: JwtService
) : OncePerRequestFilter() {

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        // Cookie에서 토큰 추출 ❌
        val token = request.cookies
            ?.find { it.name == "chores_token" }
            ?.value

        if (token != null && jwtService.validateToken(token)) {
            val userId = jwtService.extractUserId(token)
            val authentication = UsernamePasswordAuthenticationToken(
                userId, null, emptyList()
            )
            SecurityContextHolder.getContext().authentication = authentication
        }

        filterChain.doFilter(request, response)
    }
}
```

#### After (Authorization 헤더에서 토큰 추출)
```kotlin
// JwtAuthenticationFilter.kt
class JwtAuthenticationFilter(
    private val jwtService: JwtService
) : OncePerRequestFilter() {

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        // Authorization 헤더에서 토큰 추출 ✅
        val authHeader = request.getHeader("Authorization")
        val token = authHeader
            ?.takeIf { it.startsWith("Bearer ") }
            ?.substring(7)  // "Bearer " 제거

        if (token != null && jwtService.validateToken(token)) {
            val userId = jwtService.extractUserId(token)
            val authentication = UsernamePasswordAuthenticationToken(
                userId, null, emptyList()
            )
            SecurityContextHolder.getContext().authentication = authentication
        }

        filterChain.doFilter(request, response)
    }
}
```

---

### 4. 로그아웃 수정

#### Before (Cookie 삭제)
```kotlin
@PostMapping("/auth/logout")
fun logout(response: HttpServletResponse) {
    // Cookie 삭제 ❌
    val cookie = Cookie("chores_token", null)
    cookie.maxAge = 0
    cookie.path = "/"
    cookie.isHttpOnly = true
    cookie.secure = true
    response.addCookie(cookie)
}
```

#### After (서버 측 처리 선택사항)
```kotlin
@PostMapping("/auth/logout")
fun logout(): LogoutResponse {
    // 클라이언트가 localStorage에서 토큰 삭제
    // 서버는 응답만 반환 (필요 시 토큰 블랙리스트 처리)

    // Optional: 토큰 블랙리스트에 추가
    // val token = extractTokenFromRequest()
    // tokenBlacklistService.addToBlacklist(token)

    return LogoutResponse(success = true)
}
```

---

### 5. CORS 설정 업데이트

#### Before
```kotlin
@Configuration
class CorsConfig : WebMvcConfigurer {
    override fun addCorsMappings(registry: CorsRegistry) {
        registry.addMapping("/api/**")
            .allowedOrigins(
                "https://localhost:5173",
                "https://pminsu01.github.io"
            )
            .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
            .allowedHeaders("*")
            .allowCredentials(true)  // ❌ 더 이상 필요 없음
            .maxAge(3600)
    }
}
```

#### After
```kotlin
@Configuration
class CorsConfig : WebMvcConfigurer {
    override fun addCorsMappings(registry: CorsRegistry) {
        registry.addMapping("/api/**")
            .allowedOrigins(
                "https://localhost:5173",
                "https://pminsu01.github.io"
            )
            .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
            .allowedHeaders("*", "Authorization")  // ✅ Authorization 헤더 명시
            .exposedHeaders("Authorization")  // ✅ 클라이언트에 노출
            .allowCredentials(false)  // ✅ 쿠키 사용 안 함
            .maxAge(3600)
    }
}
```

---

### 6. 인증 실패 시 HTTP 상태 코드

#### 중요: 403 → 401로 변경

```kotlin
// Before: 인증 실패 시 403 반환 ❌
if (token == null || !jwtService.validateToken(token)) {
    response.status = HttpStatus.FORBIDDEN.value()  // 403 ❌
    return
}

// After: 인증 실패 시 401 반환 ✅
if (token == null || !jwtService.validateToken(token)) {
    response.status = HttpStatus.UNAUTHORIZED.value()  // 401 ✅
    return
}
```

**이유**: 클라이언트가 401/403을 동일하게 처리하지만, 401이 표준입니다.

---

## 🔒 보안 강화 (선택사항)

### 1. Content Security Policy (CSP)

XSS 공격 방지를 위한 CSP 헤더 추가:

```kotlin
@Configuration
class SecurityConfig {
    @Bean
    fun securityHeaders(): FilterRegistrationBean<ContentSecurityPolicyFilter> {
        val filter = ContentSecurityPolicyFilter()
        val registration = FilterRegistrationBean(filter)
        registration.addUrlPatterns("/*")
        return registration
    }
}

class ContentSecurityPolicyFilter : OncePerRequestFilter() {
    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        response.setHeader(
            "Content-Security-Policy",
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';"
        )
        filterChain.doFilter(request, response)
    }
}
```

### 2. 토큰 만료 시간 단축

```kotlin
// JwtService.kt
fun generateToken(userId: String): String {
    val now = Date()
    val expiryDate = Date(now.time + 900000)  // 15분 (기존: 3600000 = 1시간)

    return Jwts.builder()
        .setSubject(userId)
        .setIssuedAt(now)
        .setExpiration(expiryDate)
        .signWith(SignatureAlgorithm.HS384, jwtSecret)
        .compact()
}
```

### 3. Refresh Token 패턴 (선택)

```kotlin
data class LoginResponse(
    val accessToken: String,   // 15분
    val refreshToken: String,  // 7일
    val user: UserDto,
    val boards: UserBoardsDto
)

@PostMapping("/auth/refresh")
fun refresh(@RequestBody request: RefreshRequest): RefreshResponse {
    val userId = jwtService.extractUserId(request.refreshToken)
    val newAccessToken = jwtService.generateAccessToken(userId)

    return RefreshResponse(accessToken = newAccessToken)
}
```

---

## ✅ 테스트 체크리스트

### 서버 측 테스트

- [ ] **로그인 API**: 응답에 `token` 필드 포함 확인
  ```bash
  curl -X POST https://starlight-8.asuscomm.com:5643/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"userId":"pminsu2"}' | jq '.token'
  ```

- [ ] **회원가입 API**: 응답에 `token` 필드 포함 확인
  ```bash
  curl -X POST https://starlight-8.asuscomm.com:5643/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"userId":"testuser","nickname":"테스트","color":"#3b82f6"}' | jq '.token'
  ```

- [ ] **인증 필요 API**: Authorization 헤더로 접근 가능 확인
  ```bash
  curl https://starlight-8.asuscomm.com:5643/api/boards/74EWJ \
    -H "Authorization: Bearer eyJhbGciOiJIUzM4NCJ9..."
  ```

- [ ] **인증 실패**: 토큰 없으면 401 반환 확인
  ```bash
  curl -I https://starlight-8.asuscomm.com:5643/api/boards/74EWJ
  # 기대: HTTP/1.1 401 Unauthorized
  ```

- [ ] **CORS**: preflight 요청 확인
  ```bash
  curl -X OPTIONS https://starlight-8.asuscomm.com:5643/api/auth/login \
    -H "Origin: https://pminsu01.github.io" \
    -H "Access-Control-Request-Method: POST"
  # 기대: Access-Control-Allow-Origin: https://pminsu01.github.io
  ```

### 브라우저 테스트

- [ ] **Chrome**: 로그인 → 보드 접근 정상 작동
- [ ] **Safari**: 로그인 → 보드 접근 정상 작동 (ITP 해결)
- [ ] **Firefox**: 로그인 → 보드 접근 정상 작동
- [ ] **새로고침**: 로그인 유지 (localStorage에서 토큰 자동 로드)
- [ ] **로그아웃**: 토큰 삭제 및 재로그인 필요

---

## 📊 마이그레이션 체크리스트

### 서버 코드 수정
- [ ] `LoginResponse`에 `token` 필드 추가
- [ ] `RegisterResponse`에 `token` 필드 추가
- [ ] `JwtAuthenticationFilter`에서 Authorization 헤더 파싱
- [ ] Cookie 설정 코드 제거 (`response.addCookie()`)
- [ ] CORS 설정에서 `allowCredentials(false)` 설정
- [ ] CORS 설정에 `Authorization` 헤더 추가
- [ ] 인증 실패 시 401 반환 (403 아님)

### 테스트
- [ ] 로그인 API 테스트 (응답에 token 포함)
- [ ] 회원가입 API 테스트 (응답에 token 포함)
- [ ] 인증 필요 API 테스트 (Authorization 헤더)
- [ ] 모든 브라우저에서 테스트 (Chrome, Safari, Firefox)

### 배포
- [ ] 서버 재배포
- [ ] 클라이언트 재배포 (이미 완료)
- [ ] 프로덕션 테스트

---

## 🚀 배포 순서

1. **서버 먼저 배포**:
   - 새로운 엔드포인트는 이전 Cookie 방식과 호환됨
   - 응답에 `token` 필드만 추가되므로 기존 클라이언트도 작동

2. **클라이언트 배포**:
   - localStorage 방식으로 전환
   - Safari ITP 문제 해결

3. **검증**:
   - 모든 브라우저에서 정상 작동 확인
   - Safari에서 쿠키 차단 문제 해결 확인

---

## 💡 참고사항

### 왜 HttpOnly Cookie를 포기하는가?

1. **Safari ITP**: cross-site 쿠키를 기본적으로 차단
2. **Chrome 3rd-party Cookie 단계적 차단**: 2024년부터 시작
3. **사용자 경험**: Safari에서 매번 로그인 필요 (나쁜 UX)
4. **현대 웹 표준**: localStorage + Authorization Header가 더 일반적

### XSS 공격 방어 전략

1. **CSP (Content Security Policy)**: XSS 공격 벡터 차단
2. **짧은 토큰 만료 시간**: 15분 (탈취 시 피해 최소화)
3. **Refresh Token 패턴**: 장기 토큰은 서버 측 관리
4. **입력 검증**: 모든 사용자 입력 철저히 검증

---

## 📞 문의

구현 중 문제가 발생하면 클라이언트 팀에 문의해주세요.

**마이그레이션 완료 시 Safari ITP 문제가 완전히 해결됩니다!** 🎉
