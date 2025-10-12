import { homeState, type RecentRoom } from '../utils/homeState';
import { api } from '../api/httpApi';
import { escapeHtml, showToast } from '../utils/domHelpers';
import { navigateTo } from '../utils/navigation';

type UIStatus = 'idle' | 'loading' | 'success' | 'error';

interface OperationState {
  status: UIStatus;
  error?: string;
}

export class HomeScreen {
  private container: HTMLElement;
  private unsubscribe: (() => void) | null = null;
  private operationState: OperationState = { status: 'idle' };

  constructor(container: HTMLElement) {
    this.container = container;
    this.unsubscribe = homeState.subscribe(() => this.render());
    this.render();
  }

  private render(): void {
    const recentRooms = homeState.getRecentRooms();

    if (recentRooms.length === 0) {
      this.renderEmpty();
    } else {
      this.renderWithRecent(recentRooms);
    }
  }

  private renderEmpty(): void {
    this.container.innerHTML = `
      <div class="home-screen empty">
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <h1>집안일 분담 서비스에 오신 것을 환영합니다</h1>
          <p>새로운 보드를 만들거나 기존 보드에 합류하세요</p>
          <div class="cta-buttons">
            <button class="btn-primary" data-action="create">
              ➕ 새 보드 만들기
            </button>
            <button class="btn-secondary" data-action="join">
              🔗 보드 합류하기
            </button>
          </div>
        </div>
      </div>
    `;
    this.attachListeners();
  }

  private renderWithRecent(rooms: RecentRoom[]): void {
    const recentHTML = rooms
      .map(
        room => `
      <div class="room-card" data-room-id="${room.boardCode}">
        <div class="room-info">
          <h3>${escapeHtml(room.title)}</h3>
          ${room.boardCode ? `<span class="room-code">코드: ${room.boardCode}</span>` : ''}
          <span class="room-role">${room.hasEdit ? '👑 편집 가능' : '👀 읽기 전용'}</span>
        </div>
        <div class="room-meta">
          <span class="last-visited">${this.formatTime(room.lastVisited)}</span>
          <button class="btn-icon" data-action="open" data-room-id="${room.boardCode}">→</button>
        </div>
      </div>
    `,
      )
      .join('');

    this.container.innerHTML = `
      <div class="home-screen with-recent">
        <div class="home-container">
          <header class="home-header">
            <h1>집안일 보드</h1>
            <div class="header-actions">
              <button class="btn-primary" data-action="create">➕ 새 보드</button>
              <button class="btn-secondary" data-action="join">🔗 합류</button>
            </div>
          </header>
          <section class="recent-rooms">
            <h2>최근 보드</h2>
            <div class="rooms-list">${recentHTML}</div>
          </section>
        </div>
      </div>
    `;
    this.attachListeners();
  }

  private attachListeners(): void {
    // Create board
    this.container.querySelectorAll('[data-action="create"]').forEach(btn => btn.addEventListener('click', () => this.handleCreate()));

    // Join board
    this.container.querySelectorAll('[data-action="join"]').forEach(btn => btn.addEventListener('click', () => this.handleJoin()));

    // Open room
    this.container.querySelectorAll('[data-action="open"]').forEach(btn =>
      btn.addEventListener('click', e => {
        const boardCode = (e.target as HTMLElement).dataset.boardCode!;
        this.handleOpen(boardCode);
      }),
    );
  }

  private handleCreate(): void {
    this.showTitleInputDialog();
  }

  private showTitleInputDialog(): void {
    const overlay = document.createElement('div');
    overlay.className = 'title-dialog-overlay';
    overlay.innerHTML = `
      <div class="title-dialog">
        <h3>새 보드 만들기</h3>
        <input
          type="text"
          class="title-dialog-input"
          placeholder="보드 이름을 입력하세요"
          maxlength="50"
          autofocus
        />
        <div class="dialog-actions">
          <button class="btn-secondary" data-action="cancel">취소</button>
          <button class="btn-primary" data-action="create">생성</button>
        </div>
      </div>
    `;

    const input = overlay.querySelector('.title-dialog-input') as HTMLInputElement;
    const cancelBtn = overlay.querySelector('[data-action="cancel"]') as HTMLButtonElement;
    const createBtn = overlay.querySelector('[data-action="create"]') as HTMLButtonElement;

    // Focus input after render
    setTimeout(() => input.focus(), 10);

    // Cancel handler
    cancelBtn.addEventListener('click', () => {
      overlay.remove();
    });

    // Create handler
    const handleCreateClick = async () => {
      const title = input.value.trim();

      if (!title) {
        input.focus();
        input.classList.add('error');
        setTimeout(() => input.classList.remove('error'), 300);
        return;
      }

      // Disable buttons during creation
      createBtn.disabled = true;
      cancelBtn.disabled = true;
      createBtn.classList.add('loading');

      try {
        await this.createBoardWithTitle(title);
        overlay.remove();
      } catch (error) {
        // Re-enable buttons on error
        createBtn.disabled = false;
        cancelBtn.disabled = false;
        createBtn.classList.remove('loading');
        overlay.remove();
      }
    };

    createBtn.addEventListener('click', handleCreateClick);

    // Enter key handler
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleCreateClick();
      }
    });

    // Escape key handler
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        overlay.remove();
      }
    });

    document.body.appendChild(overlay);
  }

  private async createBoardWithTitle(title: string): Promise<void> {
    this.setOperationState({ status: 'loading' });
    showToast('보드 생성 중...', 'info');

    try {
      const response = await api.createBoard(title);

      homeState.addRecentRoom({
        boardCode: response.boardCode,
        title: response.title,
        hasEdit: true,
        lastVisited: Date.now(),
      });

      // 보드 목록은 서버에서 관리 (필요할 때 api.fetchUserBoards()로 가져옴)
      homeState.saveEditToken(response.boardCode, response.editToken);

      this.setOperationState({ status: 'success' });
      navigateTo(`/boards/${response.boardCode}`);
    } catch (error) {
      this.setOperationState({
        status: 'error',
        error: error instanceof Error ? error.message : '보드 생성 실패',
      });
      showToast('보드를 생성할 수 없습니다. 다시 시도해주세요.', 'error');
      this.showRetryDialog(() => this.showTitleInputDialog());
    }
  }

  private async handleJoin(): Promise<void> {
    const code = prompt('보드 코드를 입력하세요 (6자리):');
    if (!code) return;

    if (code.length !== 6) {
      showToast('올바른 6자리 코드를 입력하세요.', 'error');
      return;
    }

    this.setOperationState({ status: 'loading' });
    showToast('보드 합류 중...', 'info');

    try {
      await api.validateBoardCode(code);
      this.setOperationState({ status: 'success' });
      navigateTo(`/boards/${code}`);
    } catch (error) {
      this.setOperationState({
        status: 'error',
        error: error instanceof Error ? error.message : '보드 합류 실패',
      });
      showToast('보드를 찾을 수 없습니다. 코드를 확인해주세요.', 'error');
    }
  }

  private handleOpen(boardCode: string): void {
    const editToken = homeState.getEditToken(boardCode);
    const url = editToken ? `/boards/${boardCode}?t=${editToken}` : `/boards/${boardCode}`;
    navigateTo(url);
  }

  private setOperationState(state: OperationState): void {
    this.operationState = state;
    this.updateLoadingUI();
  }

  private updateLoadingUI(): void {
    const buttons = this.container.querySelectorAll('button[data-action]');
    const isLoading = this.operationState.status === 'loading';

    buttons.forEach(btn => {
      (btn as HTMLButtonElement).disabled = isLoading;
      if (isLoading) {
        btn.classList.add('loading');
      } else {
        btn.classList.remove('loading');
      }
    });
  }

  private showRetryDialog(retryFn: () => void): void {
    const overlay = document.createElement('div');
    overlay.className = 'retry-dialog-overlay';
    overlay.innerHTML = `
      <div class="retry-dialog">
        <h3>⚠️ 연결 실패</h3>
        <p>서버에 연결할 수 없습니다.</p>
        <div class="dialog-actions">
          <button class="btn-secondary" data-action="cancel">취소</button>
          <button class="btn-primary" data-action="retry">다시 시도</button>
        </div>
      </div>
    `;

    overlay.querySelector('[data-action="cancel"]')?.addEventListener('click', () => {
      overlay.remove();
    });

    overlay.querySelector('[data-action="retry"]')?.addEventListener('click', () => {
      overlay.remove();
      retryFn();
    });

    document.body.appendChild(overlay);
  }

  private formatTime(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}일 전`;
    if (hours > 0) return `${hours}시간 전`;
    if (minutes > 0) return `${minutes}분 전`;
    return '방금 전';
  }


  destroy(): void {
    this.unsubscribe?.();
  }
}
