/**
 * 쿠키 관리 유틸리티 (HttpOnly Cookie 방식)
 *
 * HttpOnly Cookie 방식:
 * - JWT 토큰은 백엔드가 Set-Cookie 헤더로 자동 설정
 * - 프론트엔드는 credentials: 'include'로 자동 전송
 * - JavaScript에서 토큰에 접근 불가 (보안상 안전)
 *
 * 사용자 정보 및 보드 목록:
 * - 서버에서 필요할 때마다 API 호출로 가져옴
 * - localStorage에 저장하지 않음 (항상 최신 상태 유지)
 */

/**
 * 인증 정보 전체 삭제
 *
 * HttpOnly Cookie는 백엔드 /auth/logout API 호출로 삭제됨
 * 프론트엔드에서는 할 일이 없음
 */
export function clearAuth(): void {
  console.info('[Auth] Clearing auth - token will be cleared by server-side logout API');
  // HttpOnly Cookie는 서버에서 삭제
  // localStorage에도 아무것도 저장하지 않음
}
