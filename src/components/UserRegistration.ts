import { api } from '../api/httpApi';
import { showToast } from '../utils/domHelpers';
import { navigateTo } from '../utils/navigation';
import { saveToken } from '../utils/auth';
import { setupEnterKeyHandler } from '../utils/inputHelpers';

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
  private verificationSent: boolean = false;
  private emailVerified: boolean = false;
  private verifiedEmail: string = '';
  private verifiedCode: string = ''; // 인증된 코드 저장
  private currentEmail: string = ''; // 현재 입력된 이메일 저장
  private countdownInterval: number | null = null;
  private remainingSeconds: number = 0;

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
          <p class="registration-subtitle">사용자 Email, 닉네임, 좋아하는 색상을 입력하세요</p>

          <div class="registration-form">
            <div class="input-group">
              <label for="user-client-id">이메일</label>
              <div class="email-input-wrapper">
                <input
                  type="email"
                  id="user-client-id"
                  class="user-client-id-input ${this.emailVerified || this.verificationSent ? 'verified' : ''}"
                  placeholder="이메일을 입력하세요"
                  maxlength="100"
                  autofocus
                  ${this.emailVerified || this.verificationSent ? 'disabled' : ''}
                  value="${this.emailVerified ? this.verifiedEmail : this.currentEmail}"
                />
                <button
                  class="btn-verification-inline"
                  data-action="send-verification"
                  type="button"
                  ${this.emailVerified ? 'disabled' : ''}
                >
                  ${this.emailVerified ? '인증완료' : this.verificationSent ? '재발송' : '인증번호 발송'}
                </button>
              </div>
              ${this.remainingSeconds > 0 ? `
                <span class="input-hint countdown">
                  인증번호 유효시간: ${this.formatTime(this.remainingSeconds)}
                </span>
              ` : ''}
            </div>

            ${this.verificationSent && !this.emailVerified ? `
              <div class="input-group">
                <label for="verification-code">인증번호</label>
                <div class="email-input-wrapper">
                  <input
                    type="text"
                    id="verification-code"
                    class="verification-code-input"
                    placeholder="인증번호 6자리"
                    maxlength="6"
                  />
                  <button class="btn-verification-inline" data-action="verify-email" type="button">
                    인증하기
                  </button>
                </div>
                <span class="input-hint">이메일로 받은 6자리 인증번호를 입력하세요</span>
              </div>
            ` : ''}

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
    const verificationCodeInput = this.container.querySelector('#verification-code') as HTMLInputElement;
    const nicknameInput = this.container.querySelector('#user-nickname') as HTMLInputElement;
    const registerBtn = this.container.querySelector('[data-action="register"]') as HTMLButtonElement;
    const sendVerificationBtn = this.container.querySelector('[data-action="send-verification"]') as HTMLButtonElement;
    const verifyEmailBtn = this.container.querySelector('[data-action="verify-email"]') as HTMLButtonElement;

    // Color selection - preserve input values
    this.container.querySelectorAll('.color-option').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const color = (e.currentTarget as HTMLElement).dataset.color!;

        // Save current input values
        const currentUserId = userIdInput?.value || '';
        const currentVerificationCode = verificationCodeInput?.value || '';
        const currentNickname = nicknameInput?.value || '';

        // Update color
        this.selectedColor = color;

        // Re-render
        this.render();

        // Restore input values after render
        const newUserIdInput = this.container.querySelector('#user-client-id') as HTMLInputElement;
        const newVerificationCodeInput = this.container.querySelector('#verification-code') as HTMLInputElement;
        const newNicknameInput = this.container.querySelector('#user-nickname') as HTMLInputElement;
        if (newUserIdInput) newUserIdInput.value = currentUserId;
        if (newVerificationCodeInput) newVerificationCodeInput.value = currentVerificationCode;
        if (newNicknameInput) newNicknameInput.value = currentNickname;
      });
    });

    // Send verification button
    if (sendVerificationBtn) {
      sendVerificationBtn.addEventListener('click', () => this.handleSendVerification());
    }

    // Verify email button
    if (verifyEmailBtn) {
      verifyEmailBtn.addEventListener('click', () => this.handleVerifyEmail());
    }

    // Register button
    registerBtn.addEventListener('click', () => this.handleRegister());

    // Enter key on inputs - with Korean IME support
    if (userIdInput) {
      setupEnterKeyHandler(userIdInput, () => this.handleRegister());
    }
    if (verificationCodeInput) {
      setupEnterKeyHandler(verificationCodeInput, () => this.handleRegister());
    }
    if (nicknameInput) {
      setupEnterKeyHandler(nicknameInput, () => this.handleRegister());
    }

    // Back to login
    this.container.querySelector('[data-action="back"]')?.addEventListener('click', () => {
      navigateTo('/');
    });
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  private startCountdown(): void {
    // 기존 타이머가 있으면 정리
    if (this.countdownInterval !== null) {
      clearInterval(this.countdownInterval);
    }

    // 5분 = 300초
    this.remainingSeconds = 300;

    this.countdownInterval = window.setInterval(() => {
      this.remainingSeconds--;

      // UI 업데이트
      const countdownElement = this.container.querySelector('.countdown');
      if (countdownElement) {
        countdownElement.textContent = `인증번호 유효시간: ${this.formatTime(this.remainingSeconds)}`;
      }

      if (this.remainingSeconds <= 0) {
        if (this.countdownInterval !== null) {
          clearInterval(this.countdownInterval);
          this.countdownInterval = null;
        }
        showToast('인증번호 유효시간이 만료되었습니다. 재발송해주세요.', 'error');
        this.verificationSent = false;
        this.render();
      }
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.countdownInterval !== null) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    this.remainingSeconds = 0;
  }

  private async handleSendVerification(): Promise<void> {
    const userIdInput = this.container.querySelector('#user-client-id') as HTMLInputElement;
    const userId = userIdInput.value.trim();

    // 이메일 형식 검증
    if (!userId) {
      userIdInput.focus();
      userIdInput.classList.add('error');
      setTimeout(() => userIdInput.classList.remove('error'), 300);
      showToast('이메일을 입력하세요', 'error');
      return;
    }

    if (!this.isValidEmail(userId)) {
      userIdInput.focus();
      userIdInput.classList.add('error');
      setTimeout(() => userIdInput.classList.remove('error'), 300);
      showToast('유효한 이메일 주소를 입력하세요', 'error');
      return;
    }

    const sendVerificationBtn = this.container.querySelector('[data-action="send-verification"]') as HTMLButtonElement;
    sendVerificationBtn.disabled = true;
    sendVerificationBtn.classList.add('loading');

    try {
      await api.sendVerification(userId);

      // 이메일 저장
      this.currentEmail = userId;
      this.verificationSent = true;

      showToast('인증번호가 발송되었습니다', 'success');

      // 5분 카운트다운 시작
      this.startCountdown();

      // UI 재렌더링
      this.render();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '인증번호 발송에 실패했습니다';
      showToast(errorMessage, 'error');
    } finally {
      sendVerificationBtn.disabled = false;
      sendVerificationBtn.classList.remove('loading');
    }
  }

  private async handleVerifyEmail(): Promise<void> {
    const userIdInput = this.container.querySelector('#user-client-id') as HTMLInputElement;
    const verificationCodeInput = this.container.querySelector('#verification-code') as HTMLInputElement;
    const email = userIdInput.value.trim();
    const verificationCode = verificationCodeInput.value.trim();

    // 인증번호 검증
    if (!verificationCode) {
      verificationCodeInput.focus();
      verificationCodeInput.classList.add('error');
      setTimeout(() => verificationCodeInput.classList.remove('error'), 300);
      showToast('인증번호를 입력하세요', 'error');
      return;
    }

    const verifyBtn = this.container.querySelector('[data-action="verify-email"]') as HTMLButtonElement;
    verifyBtn.disabled = true;
    verifyBtn.classList.add('loading');

    try {
      await api.verifyEmail(email, verificationCode);

      // 인증 성공
      this.emailVerified = true;
      this.verifiedEmail = email;
      this.verifiedCode = verificationCode; // 인증된 코드 저장

      // 카운트다운 중지
      this.stopCountdown();

      showToast('이메일 인증이 완료되었습니다', 'success');

      // UI 재렌더링
      this.render();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '인증번호가 일치하지 않습니다';
      showToast(errorMessage, 'error');

      verifyBtn.disabled = false;
      verifyBtn.classList.remove('loading');
    }
  }

  private async handleRegister(): Promise<void> {
    const nicknameInput = this.container.querySelector('#user-nickname') as HTMLInputElement;
    const nickname = nicknameInput.value.trim();

    // 이메일 인증 확인
    if (!this.emailVerified) {
      showToast('이메일 인증을 완료해주세요', 'error');
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
      // Register user (인증된 이메일, 닉네임, 색상, 인증코드 전송)
      const response = await api.registerUser(this.verifiedEmail, nickname, this.selectedColor, this.verifiedCode);

      // JWT 토큰 저장
      if (response.token) {
        saveToken(response.token);
      } else {
        console.error('[UserRegistration] No token in register response');
      }

      showToast('등록 완료! 보드 목록으로 이동합니다...', 'success');

      // Navigate to board list after short delay
      setTimeout(() => {
        navigateTo('/boards');
      }, 500);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '등록에 실패했습니다';

      registerBtn.disabled = false;
      registerBtn.classList.remove('loading');

      showToast(errorMessage, 'error');
    }
  }


  destroy(): void {
    // 타이머 정리
    this.stopCountdown();
  }
}
