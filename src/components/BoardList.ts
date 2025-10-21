import { api } from '../api/httpApi';
import { homeState } from '../utils/homeState';
import { escapeHtml, showErrorPopup } from '../utils/domHelpers';
import { navigateTo } from '../utils/navigation';

export class BoardList {
  private container: HTMLElement;
  private boards: { boardCode: string; title: string }[] = [];
  private loading: boolean = true;
  private error: string | null = null;

  constructor(container: HTMLElement, _userId?: string) {
    this.container = container;
    // userId는 더 이상 필요 없음 (JWT 토큰에서 서버가 자동으로 추출)
    this.init();
  }

  private async init(): Promise<void> {
    this.render();
    await this.loadBoards();
  }

  private async loadBoards(): Promise<void> {
    this.loading = true;
    this.error = null;
    this.render();

    try {
      // 항상 서버에서 최신 보드 목록을 가져온다 (캐시 사용 안 함)
      const boards = await api.fetchUserBoards();
      this.boards = boards.map(b => ({ boardCode: b.boardCode, title: b.title }));

      this.loading = false;
      this.render();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '보드를 불러올 수 없습니다';
      this.error = errorMessage;
      this.loading = false;
      this.render();
    }
  }

  private render(): void {
    if (this.loading) {
      this.renderLoading();
      return;
    }

    if (this.error) {
      this.renderError();
      return;
    }

    if (this.boards.length === 0) {
      this.renderEmpty();
      return;
    }

    this.renderBoards();
  }

  private renderLoading(): void {
    this.container.innerHTML = `
      <div class="board-list">
        <div class="board-list-header">
          <button class="back-button" data-action="back">◀</button>
          <h1>내 보드 목록</h1>
        </div>
        <div class="loading-state">
          <div class="loading-spinner">⏳</div>
          <p>보드 목록을 불러오는 중...</p>
        </div>
      </div>
    `;
    this.attachBackListener();
  }

  private renderError(): void {
    this.container.innerHTML = `
      <div class="board-list">
        <div class="board-list-header">
          <button class="back-button" data-action="back">◀</button>
          <h1>내 보드 목록</h1>
        </div>
        <div class="error-state">
          <div class="error-icon">⚠️</div>
          <h2>보드를 불러올 수 없습니다</h2>
          <p>${escapeHtml(this.error || '알 수 없는 오류')}</p>
          <button class="btn-primary" data-action="retry">다시 시도</button>
        </div>
      </div>
    `;
    this.attachBackListener();
    this.container.querySelector('[data-action="retry"]')?.addEventListener('click', () => this.loadBoards());
  }

  private renderEmpty(): void {
    // Show empty state with centered buttons when user has no boards
    this.container.innerHTML = `
      <div class="board-list">
        <div class="board-list-header">
          <div class="header-left">
            <button class="back-button" data-action="back">◀</button>
            <h1>내 집안일 보드</h1>
          </div>
        </div>
        <div class="empty-boards-state">
          <div class="empty-icon">📋</div>
          <h2>집안일 전쟁은 이제 그만! 평화로운 분담의 세계로 초대합니다.</h2>
          <br/>
          <p class="empty-description">새로운 보드를 만들거나 기존 보드에 합류하세요</p>
          <div class="empty-actions">
            <button class="btn-primary" data-action="create">➕ 새 보드 만들기</button>
            <button class="btn-secondary" data-action="join">🔗 보드 합류하기</button>
          </div>
        </div>
      </div>
    `;

    this.attachListeners();
  }

  private renderBoards(): void {
    // Render user's boards section (only from getUserBoards API)
    const boardsHTML = this.boards
      .map(
        board => `
        <div class="board-list-item" data-board-id="${board.boardCode}">
          <div class="board-item-info">
            <h3>${escapeHtml(board.title)}</h3>
            <span class="board-item-code clickable" data-action="copy-code" data-code="${board.boardCode}">
              코드: ${board.boardCode}
            </span>
          </div>
          <button class="btn-icon" data-action="open" data-board-id="${board.boardCode}">→</button>
        </div>
      `,
      )
      .join('');

    this.container.innerHTML = `
      <div class="board-list">
        <div class="board-list-header">
          <div class="header-left">
            <button class="back-button" data-action="back">◀</button>
            <h1>내 보드 목록</h1>
          </div>
          <div class="header-actions">
            <button class="btn-primary" data-action="create">➕ 새 보드</button>
            <button class="btn-secondary" data-action="join">🔗 합류</button>
          </div>
        </div>
        <div class="board-list-content">
          <section class="my-boards">
            <h3>참여 중인 보드 (${this.boards.length}개)</h3>
            <div class="boards-grid">
              ${boardsHTML}
            </div>
          </section>
        </div>
      </div>
    `;

    this.attachListeners();
  }

  private attachBackListener(): void {
    this.container.querySelector('[data-action="back"]')?.addEventListener('click', () => {
      this.showLogoutConfirmation();
    });
  }

  private showLogoutConfirmation(): void {
    const overlay = document.createElement('div');
    overlay.className = 'logout-dialog-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'logout-dialog';
    dialog.innerHTML = `
      <div class="logout-dialog-header">
        <h3>로그아웃</h3>
      </div>
      <div class="logout-dialog-body">
        <p>정말 로그아웃 하시겠습니까?</p>
      </div>
      <div class="logout-dialog-footer">
        <button class="btn-secondary logout-cancel">취소</button>
        <button class="btn-primary logout-confirm">확인</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const cancelBtn = dialog.querySelector('.logout-cancel') as HTMLButtonElement;
    const confirmBtn = dialog.querySelector('.logout-confirm') as HTMLButtonElement;

    const closeDialog = () => {
      overlay.remove();
    };

    // Cancel button - just close dialog
    cancelBtn.addEventListener('click', closeDialog);

    // Overlay click - close dialog
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeDialog();
      }
    });

    // Confirm button - logout
    confirmBtn.addEventListener('click', async () => {
      confirmBtn.disabled = true;
      confirmBtn.textContent = '로그아웃 중...';

      try {
        await this.handleLogout();
        closeDialog();
      } catch (error) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = '확인';
        closeDialog();
      }
    });

    // Escape key handler
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDialog();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Show dialog with animation
    setTimeout(() => {
      overlay.classList.add('show');
    }, 10);
  }

  private async handleLogout(): Promise<void> {
    try {
      await api.logout();

      // clearAuth에서 boards 캐시를 포함한 모든 인증 정보를 정리
      const { clearAuth } = await import('../utils/auth');
      await clearAuth();
      navigateTo('/');
    } catch (error) {
      showErrorPopup('로그아웃에 실패했습니다');
      throw error;
    }
  }

  private attachListeners(): void {
    this.attachBackListener();

    // Copy board code to clipboard
    this.container.querySelectorAll('[data-action="copy-code"]').forEach(codeEl => {
      codeEl.addEventListener('click', async (e) => {
        e.stopPropagation();
        const target = e.currentTarget as HTMLElement;
        const code = target.getAttribute('data-code');
        if (code) {
          await this.copyToClipboard(code);
        }
      });
    });

    // Open board from user's board list (arrow button)
    this.container.querySelectorAll('[data-action="open"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Prevent parent .board-list-item click from firing
        e.stopPropagation();
        const target = e.currentTarget as HTMLElement;
        const boardCode = target.getAttribute('data-board-id');
        if (boardCode) {
          navigateTo(`/boards/${boardCode}`);
        }
      });
    });

    // Also allow clicking anywhere on the list item to open the board
    this.container.querySelectorAll('.board-list-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const current = e.currentTarget as HTMLElement;
        const boardCode = current.getAttribute('data-board-id');
        if (!boardCode) return;
        // If the actual target was a button or copy action, let those handlers handle it
        const targetEl = e.target as HTMLElement;
        if (targetEl && (targetEl.closest('button') || targetEl.closest('[data-action="copy-code"]'))) return;
        navigateTo(`/boards/${boardCode}`);
      });
    });

    // Create board - show creation dialog
    this.container.querySelector('[data-action="create"]')?.addEventListener('click', () => {
      this.handleCreateBoard();
    });

    // Join board
    this.container.querySelector('[data-action="join"]')?.addEventListener('click', () => {
      this.handleJoinBoard();
    });
  }

  private async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      const { showToast } = await import('../utils/domHelpers');
      showToast(`코드: ${text} 복사 되었습니다.`, 'success');
    } catch (err) {
      showErrorPopup('클립보드 복사에 실패했습니다.');
    }
  }

  private handleCreateBoard(): void {
    this.showTitleInputDialog();
  }

  private showTitleInputDialog(): void {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';

    // Create popup
    const popup = document.createElement('div');
    popup.className = 'popup-dialog';
    popup.innerHTML = `
      <div class="popup-header">
        <h3>새 보드 만들기</h3>
      </div>
      <div class="popup-body">
        <div class="input-group">
          <label for="board-title">보드 이름</label>
          <input
            type="text"
            id="board-title"
            class="board-title-input"
            placeholder="보드 이름을 입력하세요"
            maxlength="50"
            autofocus
          />
        </div>
      </div>
      <div class="popup-footer">
        <button class="btn-secondary popup-cancel">취소</button>
        <button class="btn-primary popup-create">생성</button>
      </div>
    `;

    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    const titleInput = popup.querySelector('#board-title') as HTMLInputElement;
    const cancelBtn = popup.querySelector('.popup-cancel') as HTMLButtonElement;
    const createBtn = popup.querySelector('.popup-create') as HTMLButtonElement;

    const closePopup = () => {
      overlay.remove();
    };

    // Cancel button
    cancelBtn.addEventListener('click', closePopup);

    // Overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closePopup();
      }
    });

    // Create button
    createBtn.addEventListener('click', async () => {
      const title = titleInput.value.trim();

      if (!title) {
        titleInput.classList.add('error');
        setTimeout(() => titleInput.classList.remove('error'), 300);
        return;
      }

      // Disable create button
      createBtn.disabled = true;
      createBtn.textContent = '생성 중...';

      try {
        // Create board
        const response = await api.createBoard(title);

        // Save to recent rooms and edit token
        homeState.addRecentRoom({
          boardCode: response.boardCode,
          title: response.title,
          hasEdit: true,
          lastVisited: Date.now(),
        });
        homeState.saveEditToken(response.boardCode, response.editToken);


        closePopup();

        // Navigate to the newly created board
        navigateTo(`/boards/${response.boardCode}`);
      } catch (error) {

        createBtn.disabled = false;
        createBtn.textContent = '생성';

        closePopup();
        showErrorPopup('보드 생성에 실패했습니다.');
      }
    });

    // Enter key
    titleInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        createBtn.click();
      }
    });

    // Show popup with animation
    setTimeout(() => {
      overlay.classList.add('show');
    }, 10);
  }

  private handleJoinBoard(): void {
    this.showPinInputPopup();
  }

  private showPinInputPopup(): void {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';

    // Create popup
    const popup = document.createElement('div');
    popup.className = 'popup-dialog';
    popup.innerHTML = `
      <div class="popup-header">
        <h3>보드 합류하기</h3>
      </div>
      <div class="popup-body">
        <div class="input-group">
          <label for="pin-code">6자리 PIN 코드를 입력하세요</label>
          <input
            type="text"
            id="pin-code"
            class="pin-input"
            placeholder="123456"
            maxlength="6"
            autofocus
          />
        </div>
      </div>
      <div class="popup-footer">
        <button class="btn-secondary popup-cancel">취소</button>
        <button class="btn-primary popup-join">합류하기</button>
      </div>
    `;

    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    const pinInput = popup.querySelector('#pin-code') as HTMLInputElement;
    const cancelBtn = popup.querySelector('.popup-cancel') as HTMLButtonElement;
    const joinBtn = popup.querySelector('.popup-join') as HTMLButtonElement;

    const closePopup = () => {
      overlay.remove();
    };

    // Cancel button
    cancelBtn.addEventListener('click', closePopup);

    // Overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closePopup();
      }
    });

    // Join button
    joinBtn.addEventListener('click', async () => {
      const boardCode = pinInput.value.trim();

      if (!boardCode || boardCode.length !== 6) {
        pinInput.classList.add('error');
        setTimeout(() => pinInput.classList.remove('error'), 300);
        return;
      }

      // Disable join button
      joinBtn.disabled = true;
      joinBtn.textContent = '합류 중...';

      try {
        // Join the board with PIN (validates existence and adds participant)
        // userId는 JWT 토큰에서 자동으로 추출됨
        const result = await api.joinBoardAsParticipant(boardCode);

        // Save to recent rooms
        homeState.addRecentRoom({
          boardCode: result.boardCode,
          title: result.title,
          hasEdit: false,
          lastVisited: Date.now(),
        });


        closePopup();

        // Navigate to the joined board
        navigateTo(`/boards/${result.boardCode}`);
      } catch (error) {

        joinBtn.disabled = false;
        joinBtn.textContent = '합류하기';

        closePopup();
        showErrorPopup('이미 합류 되었거나 해당 보드가 없습니다.');
      }
    });

    // Enter key
    pinInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        joinBtn.click();
      }
    });

    // Show popup with animation
    setTimeout(() => {
      overlay.classList.add('show');
    }, 10);
  }


  destroy(): void {
    // Cleanup if needed
  }
}
