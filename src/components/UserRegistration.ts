import { api } from '../api/httpApi';
import { showErrorPopup, showToast } from '../utils/domHelpers';
import { navigateTo } from '../utils/navigation';
import { isNetworkError } from '../utils/errors';
import { saveToken } from '../utils/auth';

const PRESET_COLORS = [
  { name: '레드', hex: '#ef4444' },
  { name: '오렌지', hex: '#f97316' },
  { name: '옐로우', hex: '#eab308' },
  { name: '그린', hex: '#22c55e' },
  { name: '틸', hex: '#14b8a6' },
  { name: '블루', hex: '#3b82f6' },
  { name: '인디고', hex: '#6366f1' },
  { name: '퍼플', hex: '#a855f7' },
  { name: '핑크', hex: '#ec4899' },
  { name: '그레이', hex: '#6b7280' },
];

export class UserRegistration {
  private container: HTMLElement;
  private selectedColor: string = PRESET_COLORS[0].hex; // Default blue

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  private render(): void {
    const colorOptions = PRESET_COLORS.map(
      (color) => `
        <button
          class="color-option ${this.selectedColor === color.hex ? 'selected' : ''}"
          data-color="${color.hex}"
          data-color-name="${color.name}"
          style="background-color: ${color.hex}"
          title="${color.name}"
        >
          ${this.selectedColor === color.hex ? '✓' : ''}
        </button>
      `,
    ).join('');

    this.container.innerHTML = `
      <div class="user-registration">
        <div class="registration-card">
          <div class="registration-icon">👤</div>
          <h1>사용자 등록</h1>
          <p class="registration-subtitle">사용자 ID, 닉네임, 좋아하는 색상을 입력하세요</p>

          <div class="registration-form">
            <div class="input-group">
              <label for="user-client-id">사용자 ID</label>
              <input
                type="text"
                id="user-client-id"
                class="user-client-id-input"
                placeholder="사용자 ID를 입력하세요"
                maxlength="50"
                autofocus
              />
              <span class="input-hint">영문, 숫자만 사용 가능</span>
            </div>

            <div class="input-group">
              <label for="user-nickname">닉네임</label>
              <input
                type="text"
                id="user-nickname"
                class="user-nickname-input"
                placeholder="닉네임을 입력하세요"
                maxlength="50"
              />
              <span class="input-hint">최대 50자</span>
            </div>

            <div class="input-group">
              <label>좋아하는 색상</label>
              <div class="color-picker">
                ${colorOptions}
              </div>
            </div>

            <button class="btn-primary btn-register" data-action="register">
              등록하기
            </button>
          </div>

          <div class="back-to-login">
            <button class="btn-text" data-action="back">
              ← 로그인 화면으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    `;

    this.attachListeners();
  }

  private attachListeners(): void {
    const userIdInput = this.container.querySelector('#user-client-id') as HTMLInputElement;
    const nicknameInput = this.container.querySelector('#user-nickname') as HTMLInputElement;
    const registerBtn = this.container.querySelector('[data-action="register"]') as HTMLButtonElement;

    // Color selection - preserve input values
    this.container.querySelectorAll('.color-option').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const color = (e.currentTarget as HTMLElement).dataset.color!;

        // Save current input values
        const currentUserId = userIdInput.value;
        const currentNickname = nicknameInput.value;

        // Update color
        this.selectedColor = color;

        // Re-render
        this.render();

        // Restore input values after render
        const newUserIdInput = this.container.querySelector('#user-client-id') as HTMLInputElement;
        const newNicknameInput = this.container.querySelector('#user-nickname') as HTMLInputElement;
        if (newUserIdInput) newUserIdInput.value = currentUserId;
        if (newNicknameInput) newNicknameInput.value = currentNickname;
      });
    });

    // Register button
    registerBtn.addEventListener('click', () => this.handleRegister());

    // Enter key on inputs
    const handleEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        this.handleRegister();
      }
    };
    userIdInput.addEventListener('keypress', handleEnter);
    nicknameInput.addEventListener('keypress', handleEnter);

    // Back to login
    this.container.querySelector('[data-action="back"]')?.addEventListener('click', () => {
      navigateTo('/');
    });
  }

  private async handleRegister(): Promise<void> {
    const userIdInput = this.container.querySelector('#user-client-id') as HTMLInputElement;
    const nicknameInput = this.container.querySelector('#user-nickname') as HTMLInputElement;
    const userId = userIdInput.value.trim();
    const nickname = nicknameInput.value.trim();

    // Validate user ID
    if (!userId) {
      userIdInput.focus();
      userIdInput.classList.add('error');
      setTimeout(() => userIdInput.classList.remove('error'), 300);
      showToast('사용자 ID를 입력하세요', 'error');
      return;
    }

    // Validate nickname
    if (!nickname) {
      nicknameInput.focus();
      nicknameInput.classList.add('error');
      setTimeout(() => nicknameInput.classList.remove('error'), 300);
      showToast('닉네임을 입력하세요', 'error');
      return;
    }

    // Validate nickname length (max 50 characters)
    if (nickname.length > 50) {
      nicknameInput.focus();
      nicknameInput.classList.add('error');
      setTimeout(() => nicknameInput.classList.remove('error'), 300);
      showToast('닉네임은 50자 이하여야 합니다', 'error');
      return;
    }

    const registerBtn = this.container.querySelector('[data-action="register"]') as HTMLButtonElement;
    registerBtn.disabled = true;
    registerBtn.classList.add('loading');

    try {
      // Register user
      // localStorage 방식: 응답에서 토큰을 받아 localStorage에 저장
      const response = await api.registerUser(userId, nickname, this.selectedColor);

      // JWT 토큰 저장
      if (response.token) {
        saveToken(response.token);
        console.log('[UserRegistration] Token saved to localStorage');
      } else {
        console.error('[UserRegistration] No token in register response');
      }

      // 🔒 보안: 회원가입 시 이전 사용자 캐시 초기화 (필수)
      const { clearBoardsCache } = await import('../utils/boardsCache');
      clearBoardsCache();
      console.log('[UserRegistration] Cleared previous user cache');

      showToast('등록 완료! 보드 목록으로 이동합니다...', 'success');

      // Navigate to board list after short delay
      setTimeout(() => {
        navigateTo('/boards');
      }, 500);
    } catch (error) {
      console.error('[UserRegistration] Failed to register:', error);
      const errorMessage = error instanceof Error ? error.message : '등록에 실패했습니다';

      registerBtn.disabled = false;
      registerBtn.classList.remove('loading');

      // Show error message only if it's not a network error
      if (!isNetworkError(error)) {
        // Check if error is "already registered" - show popup and don't navigate
        if (errorMessage.includes('이미 등록') || errorMessage.includes('already') || errorMessage.includes('존재하는') || errorMessage.includes('duplicate')) {
          showErrorPopup('기존 등록된 사용자입니다.');
        } else {
          showToast('기존 등록된 사용자입니다', 'error');
        }
      }
    }
  }


  destroy(): void {
    // Cleanup if needed
  }
}
