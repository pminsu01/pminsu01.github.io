/**
 * localStorage 기반 인증 토큰 관리
 * - Safari ITP (Intelligent Tracking Prevention) 문제 해결
 * - 모든 브라우저에서 동일하게 작동
 * - Authorization: Bearer {token} 헤더 방식 사용
 */

const TOKEN_KEY = 'choresboard_jwt_token';

/**
 * JWT 토큰 저장
 */
export function saveToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    console.log('[Auth] Token saved to localStorage');
  } catch (error) {
    console.error('[Auth] Failed to save token:', error);
  }
}

/**
 * JWT 토큰 조회
 */
export function getToken(): string | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    return token;
  } catch (error) {
    console.error('[Auth] Failed to get token:', error);
    return null;
  }
}

/**
 * JWT 토큰 삭제 (로그아웃)
 */
export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    console.log('[Auth] Token cleared from localStorage');
  } catch (error) {
    console.error('[Auth] Failed to clear token:', error);
  }
}

/**
 * 인증 상태 확인
 */
export function isAuthenticated(): boolean {
  const token = getToken();
  return token !== null && token.length > 0;
}

/**
 * Authorization 헤더 생성
 */
export function getAuthHeader(): Record<string, string> | undefined {
  const token = getToken();
  if (!token) {
    return undefined;
  }
  return {
    'Authorization': `Bearer ${token}`,
  };
}

/**
 * 모든 인증 정보 삭제 (로그아웃)
 */
export function clearAuth(): void {
  clearToken();
  // sessionStorage도 정리
  sessionStorage.clear();
  console.log('[Auth] All authentication data cleared');
}
