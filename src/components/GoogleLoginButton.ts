import { api } from '../api/httpApi';
import { saveToken } from '../utils/auth';
import { navigateTo } from '../utils/navigation';
import { showErrorPopup } from '../utils/domHelpers';
import { getGoogleOAuthClientId, isWebView, logPlatformInfo } from '../utils/platform';

const GOOGLE_CLIENT_ID = getGoogleOAuthClientId();

export class GoogleLoginButton {
  private container: HTMLElement;
  private buttonId: string;

  constructor(container: HTMLElement, buttonId: string = 'google-login-button') {
    this.container = container;
    this.buttonId = buttonId;
    this.render();
  }

  private render(): void {
    // Google 로그인 버튼 컨테이너 생성
    const buttonContainer = document.createElement('div');
    buttonContainer.id = this.buttonId;
    buttonContainer.className = 'google-login-container';
    this.container.appendChild(buttonContainer);

    // Google Identity Services 스크립트 로드 확인 후 초기화
    this.initializeGoogleSignIn();
  }

  private async initializeGoogleSignIn(): Promise<void> {
    // google 객체가 로드될 때까지 대기
    const maxAttempts = 50; // 5초 (100ms * 50)
    let attempts = 0;

    const checkGoogleLoaded = setInterval(() => {
      attempts++;

      if (window.google?.accounts?.id) {
        clearInterval(checkGoogleLoaded);
        this.setupGoogleButton();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkGoogleLoaded);
        this.showFallbackButton();
      }
    }, 100);
  }

  private setupGoogleButton(): void {
    try {
      if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === '') {
        console.error('Google Client ID가 설정되지 않았습니다.');
        this.showFallbackButton();
        return;
      }

      // Google Identity Services 초기화
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: this.handleCredentialResponse.bind(this),
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      // 버튼 렌더링
      const buttonElement = document.getElementById(this.buttonId);
      if (buttonElement) {
        google.accounts.id.renderButton(buttonElement, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          width: buttonElement.offsetWidth || 300,
          locale: 'ko',
        });

        // 플랫폼 정보 및 디버깅 로그 출력
        if (isWebView()) {
          logPlatformInfo();
          console.log('WebView/앱에서 Google 로그인 버튼 렌더링 완료');
        }
      }
    } catch (error) {
      console.error('Google 로그인 버튼 설정 오류:', error);
      this.showFallbackButton();
    }
  }

  private async handleCredentialResponse(response: CredentialResponse): Promise<void> {
    try {
      // Google ID Token을 백엔드로 전송
      const result = await api.googleLogin(response.credential);

      // JWT 토큰 저장
      if (result.token) {
        saveToken(result.token);
      }

      // 보드 목록으로 이동
      navigateTo('/boards');
    } catch (error) {
      showErrorPopup('Google 로그인에 실패했습니다. 다시 시도해주세요.');
    }
  }

  private showFallbackButton(): void {
    // Google 스크립트 로드 실패 시 대체 버튼 표시
    const buttonElement = document.getElementById(this.buttonId);
    if (buttonElement) {
      buttonElement.innerHTML = `
        <button class="btn-google-fallback" disabled>
          <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
          Google 로그인 (로딩 실패)
        </button>
      `;
    }
  }

  destroy(): void {
    // Cleanup if needed
    const buttonElement = document.getElementById(this.buttonId);
    if (buttonElement) {
      buttonElement.innerHTML = '';
    }
  }
}
