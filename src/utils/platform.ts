/**
 * 플랫폼 감지 유틸리티
 * 웹 브라우저와 Capacitor WebView 환경 모두 지원
 */

/**
 * Capacitor WebView 환경인지 확인
 * 안드로이드 래퍼 앱에서 실행 중인지 체크
 */
export function isWebView(): boolean {
  // window.Capacitor가 존재하는지 런타임 체크
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    const platform = (window as any).Capacitor.getPlatform();
    return platform === 'android' || platform === 'ios';
  }
  return false;
}

/**
 * 현재 플랫폼이 안드로이드인지 확인
 */
export function isAndroid(): boolean {
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    const platform = (window as any).Capacitor.getPlatform();
    return platform === 'android';
  }
  return /Android/i.test(navigator.userAgent);
}

/**
 * 현재 플랫폼이 iOS인지 확인
 */
export function isIOS(): boolean {
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    const platform = (window as any).Capacitor.getPlatform();
    return platform === 'ios';
  }
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/**
 * 플랫폼에 따른 적절한 Google OAuth Client ID 반환
 */
export function getGoogleOAuthClientId(): string {
  if (isAndroid()) {
    return import.meta.env.VITE_GOOGLE_ANDROID_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  } else if (isIOS()) {
    return import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID || import.meta.env.VITE_GOOGLE_ANDROID_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  } else {
    return import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  }
}

/**
 * 디버깅용 플랫폼 정보 출력
 */
export function logPlatformInfo(): void {
  console.log('=== 플랫폼 정보 ===');
  console.log('isWebView:', isWebView());
  console.log('isAndroid:', isAndroid());
  console.log('isIOS:', isIOS());
  console.log('User Agent:', navigator.userAgent);

  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    console.log('Capacitor Platform:', (window as any).Capacitor.getPlatform());
    console.log('Capacitor Native:', (window as any).Capacitor.isNativePlatform());
  }

  console.log('Google Client ID:', getGoogleOAuthClientId().substring(0, 20) + '...');
  console.log('==================');
}
