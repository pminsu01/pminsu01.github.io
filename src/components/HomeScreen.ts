import { homeState, type RecentRoom } from '../utils/homeState';
import { api } from '../api/httpApi';
import { escapeHtml, showToast } from '../utils/domHelpers';
import { navigateTo } from '../utils/navigation';
import { formatRelativeTime } from '../utils/dateHelpers';
import { createInputDialog } from '../utils/dialogHelpers';

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
          <h1>집안일 전쟁은 이제 그만!<br/>평화로운 분담의 세계로 초대합니다.</h1>
          <br/>
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
          ${room.boardCode ? `<span class="room-code">코드 : ${room.boardCode}</span>` : ''}
          <span class="room-role">${room.hasEdit ? '👑 편집 가능' : '👀 읽기 전용'}</span>
        </div>
        <div class="room-meta">
          <span class="last-visited">${formatRelativeTime(room.lastVisited)}</span>
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
    createInputDialog({
      title: '새 보드 만들기',
      placeholder: '보드 이름을 입력하세요',
      confirmText: '생성',
      cancelText: '취소',
      onConfirm: async (title) => {
        await this.createBoardWithTitle(title);
      },
    });
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
      throw error; // Re-throw to let dialog handle it
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



  destroy(): void {
    this.unsubscribe?.();
  }
}
