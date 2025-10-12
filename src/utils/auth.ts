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
  } catch (error) {
    console.error('[Auth] Failed to save token:', error);
  }
}

/**
 * JWT 토큰 조회
 */
export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
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
 * JWT 토큰에서 userId 추출
 * JWT payload의 sub 필드를 userId로 사용
 */
export function getUserIdFromToken(): string | null {
  try {
    const token = getToken();
    if (!token) return null;

    // JWT는 header.payload.signature 형식
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // payload를 base64 디코딩
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const data = JSON.parse(decoded);

    // sub 필드가 userId
    return data.sub || data.userId || null;
  } catch (error) {
    console.error('[Auth] Failed to extract userId from token:', error);
    return null;
  }
}

/**
 * 모든 인증 정보 삭제 (로그아웃)
 */
export async function clearAuth(): Promise<void> {
  clearToken();
  // sessionStorage도 정리
  sessionStorage.clear();
}
