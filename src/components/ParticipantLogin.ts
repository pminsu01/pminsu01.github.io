import { api } from '../api/httpApi';
import { showErrorPopup } from '../utils/domHelpers';
import { navigateTo } from '../utils/navigation';
import { isNetworkError } from '../utils/errors';
import { saveToken } from '../utils/auth';
import { GoogleLoginButton } from './GoogleLoginButton';

export class ParticipantLogin {
  private container: HTMLElement;
  private googleLoginButton: GoogleLoginButton | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="participant-login">
        <div class="login-card">
          <div class="login-icon">
            <img src="/chores_board.png" alt="집안일 보드" />
          </div>
          <h1>집안일 보드</h1>
          <p class="login-subtitle">사용자 Email을 입력하여 내 보드를 확인하세요</p>

          <div class="login-form">
            <div class="input-group">
              <label for="user-id">사용자 Email</label>
              <input
                type="text"
                id="user-id"
                class="user-id-input"
                placeholder="사용자 Email을 입력하세요"
                autofocus
              />
            </div>

            <button class="btn-primary btn-login" data-action="login">
              내 보드 확인하기
            </button>
          </div>

          <div class="divider">
            <span>또는</span>
          </div>

          <div class="google-login-wrapper">
            <!-- Google 로그인 버튼이 여기에 렌더링됩니다 -->
          </div>

          <div class="alternative-actions">
            <button class="btn-email-register btn-register" data-action="register">
              이메일 가입하기
            </button>
          </div>
        </div>
      </div>
    `;

    this.attachListeners();
    this.setupGoogleLogin();
  }

  private setupGoogleLogin(): void {
    const googleWrapper = this.container.querySelector('.google-login-wrapper') as HTMLElement;
    if (googleWrapper) {
      this.googleLoginButton = new GoogleLoginButton(googleWrapper, 'participant-login-google-button');
    }
  }

  private attachListeners(): void {
    const input = this.container.querySelector('#user-id') as HTMLInputElement;
    const loginBtn = this.container.querySelector('[data-action="login"]') as HTMLButtonElement;

    // Login button click
    loginBtn.addEventListener('click', () => this.handleLogin());

    // Enter key on input
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleLogin();
      }
    });

    // Register button
    this.container.querySelector('[data-action="register"]')?.addEventListener('click', () => {
      navigateTo('/register');
    });
  }

  private async handleLogin(): Promise<void> {
    const input = this.container.querySelector('#user-id') as HTMLInputElement;
    const loginBtn = this.container.querySelector('[data-action="login"]') as HTMLButtonElement;
    const userId = input.value.trim();

    if (!userId) {
      input.focus();
      input.classList.add('error');
      setTimeout(() => input.classList.remove('error'), 300);
      return;
    }

    // Disable button and show loading state
    loginBtn.disabled = true;
    loginBtn.classList.add('loading');
    const originalText = loginBtn.textContent;
    loginBtn.textContent = '확인 중...';

    try {
      // Login via new auth API
      // localStorage 방식: 응답에서 토큰을 받아 localStorage에 저장
      const response = await api.login(userId);

      // JWT 토큰 저장
      if (response.token) {
        saveToken(response.token);
      }

      // Navigate to board list
      navigateTo('/boards');
    } catch (error) {
      // Re-enable button
      loginBtn.disabled = false;
      loginBtn.classList.remove('loading');
      loginBtn.textContent = originalText || '내 보드 확인하기';

      // Show error popup only if it's not a network error (which is handled globally)
      if (!isNetworkError(error)) {
        showErrorPopup('로그인에 실패했습니다. 사용자 Email을 확인하세요.');
      }
    }
  }


  destroy(): void {
    // Cleanup Google login button
    if (this.googleLoginButton) {
      this.googleLoginButton.destroy();
      this.googleLoginButton = null;
    }
  }
}
