import { api } from '../api/httpApi';
import { showErrorPopup } from '../utils/domHelpers';
import { navigateTo } from '../utils/navigation';
import { isNetworkError } from '../utils/errors';
import { saveToken } from '../utils/auth';

export class ParticipantLogin {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="participant-login">
        <div class="login-card">
          <div class="login-icon">🎯</div>
          <h1>집안일 보드</h1>
          <p class="login-subtitle">사용자 Email를 입력하여 내 보드를 확인하세요</p>

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

          <div class="alternative-actions">
            <button class="btn-secondary btn-register" data-action="register">
              ✨ 처음이신가요? 등록하기
            </button>
          </div>
        </div>
      </div>
    `;

    this.attachListeners();
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

      console.log('[ParticipantLogin] Login response:', response);

      // JWT 토큰 저장
      if (response.token) {
        saveToken(response.token);
        console.log('[ParticipantLogin] Token saved successfully');
      } else {
        console.error('[ParticipantLogin] No token in login response:', response);
      }

      // 보드 정보 로깅
      if (response.boards) {
        console.log('[ParticipantLogin] Boards in response:', response.boards);
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
    // Cleanup if needed
  }
}
