/**
 * 플랫폼 감지 유틸리티
 * 웹 브라우저 환경 전용
 */

/**
 * 현재 플랫폼이 안드로이드인지 확인
 */
export function isAndroid(): boolean {
  return /Android/i.test(navigator.userAgent);
}

/**
 * 현재 플랫폼이 iOS인지 확인
 */
export function isIOS(): boolean {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}
