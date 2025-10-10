/**
 * Shared DOM utility functions
 */

/**
 * Escapes HTML special characters to prevent XSS attacks
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Shows a toast notification
 */
export function showToast(message: string, type: 'info' | 'error' | 'success' = 'info'): void {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Shows an error popup dialog
 */
export function showErrorPopup(message: string): void {
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay';

  const popup = document.createElement('div');
  popup.className = 'popup-dialog';
  popup.innerHTML = `
    <div class="popup-header">
      <h3>오류</h3>
    </div>
    <div class="popup-body">
      <p>${escapeHtml(message)}</p>
    </div>
    <div class="popup-footer">
      <button class="btn-primary popup-close">확인</button>
    </div>
  `;

  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  const closePopup = () => {
    overlay.remove();
  };

  const closeBtn = popup.querySelector('.popup-close');
  closeBtn?.addEventListener('click', closePopup);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closePopup();
    }
  });

  setTimeout(() => {
    overlay.classList.add('show');
  }, 10);
}

/**
 * Shows a confirmation dialog
 */
export function showConfirmDialog(
  message: string,
  onConfirm: () => void,
  options?: { title?: string; confirmText?: string; cancelText?: string }
): void {
  const {
    title = '확인',
    confirmText = '확인',
    cancelText = '취소',
  } = options || {};

  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay';

  const popup = document.createElement('div');
  popup.className = 'popup-dialog';
  popup.innerHTML = `
    <div class="popup-header">
      <h3>${escapeHtml(title)}</h3>
    </div>
    <div class="popup-body">
      <p>${escapeHtml(message)}</p>
    </div>
    <div class="popup-footer">
      <button class="btn-secondary popup-cancel">${escapeHtml(cancelText)}</button>
      <button class="btn-primary popup-confirm">${escapeHtml(confirmText)}</button>
    </div>
  `;

  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  const closePopup = () => {
    overlay.remove();
  };

  const cancelBtn = popup.querySelector('.popup-cancel');
  const confirmBtn = popup.querySelector('.popup-confirm');

  cancelBtn?.addEventListener('click', closePopup);
  confirmBtn?.addEventListener('click', () => {
    closePopup();
    onConfirm();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closePopup();
    }
  });

  setTimeout(() => {
    overlay.classList.add('show');
  }, 10);
}

/**
 * Shows a network error popup with retry option
 */
export function showNetworkErrorPopup(
  message: string = '서버에 연결할 수 없습니다.',
  onRetry?: () => void | Promise<void>
): void {
  // 기존 네트워크 에러 팝업이 있다면 제거 (중복 방지)
  const existingPopup = document.querySelector('.network-error-overlay');
  if (existingPopup) {
    existingPopup.remove();
  }

  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay network-error-overlay';

  const popup = document.createElement('div');
  popup.className = 'popup-dialog network-error-dialog';
  popup.innerHTML = `
    <div class="popup-header network-error-header">
      <div class="network-error-icon">⚠️</div>
      <h3>네트워크 확인 필요</h3>
    </div>
    <div class="popup-body network-error-body">
      <p class="error-message">${escapeHtml(message)}</p>
      <ul class="error-suggestions">
        <li>Wi-Fi 또는 데이터 연결을 확인해주세요</li>
        <li>서버 상태를 확인해주세요</li>
        <li>잠시 후 다시 시도해주세요</li>
      </ul>
    </div>
    <div class="popup-footer">
      <button class="btn-secondary popup-close">확인</button>
      ${onRetry ? '<button class="btn-primary popup-retry">재시도</button>' : ''}
    </div>
  `;

  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  const closePopup = () => {
    overlay.remove();
  };

  const closeBtn = popup.querySelector('.popup-close');
  const retryBtn = popup.querySelector('.popup-retry');

  closeBtn?.addEventListener('click', closePopup);

  if (retryBtn && onRetry) {
    retryBtn.addEventListener('click', async () => {
      retryBtn.textContent = '재시도 중...';
      (retryBtn as HTMLButtonElement).disabled = true;

      try {
        await onRetry();
        closePopup();
      } catch (error) {
        // 재시도 실패 시 버튼 복원
        retryBtn.textContent = '재시도';
        (retryBtn as HTMLButtonElement).disabled = false;
      }
    });
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closePopup();
    }
  });

  // Escape key handler
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closePopup();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);

  setTimeout(() => {
    overlay.classList.add('show');
  }, 10);
}
