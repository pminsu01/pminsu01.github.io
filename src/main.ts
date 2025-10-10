import './styles/main.css';
import { HomeScreen } from './components/HomeScreen';
import { ChoreBoardComponent } from './components/ChoreBoard';
import { ParticipantLogin } from './components/ParticipantLogin';
import { BoardList } from './components/BoardList';
import { UserRegistration } from './components/UserRegistration';
import { homeState } from './utils/homeState';
import { state } from './utils/stateManager';
import { api } from './api/httpApi';
import { isNetworkError } from './utils/errors';
import { showNetworkErrorPopup } from './utils/domHelpers';

type Route = 'login' | 'register' | 'home' | 'board' | 'boardList';

interface RouterState {
  route: Route;
  params: Record<string, string>;
}

class Router {
  private currentScreen: HomeScreen | ChoreBoardComponent | ParticipantLogin | BoardList | UserRegistration | null = null;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;

    // Listen to popstate (back/forward buttons)
    window.addEventListener('popstate', () => this.handleRoute());

    // Listen to custom navigation events
    window.addEventListener('navigate', ((e: CustomEvent) => {
      this.navigate(e.detail.path, e.detail.replace);
    }) as EventListener);
  }

  private parsePath(): RouterState {
    const path = window.location.pathname;
    const search = window.location.search;

    if (path === '/' || path === '') {
      return { route: 'login', params: {} };
    }

    // Parse path parts
    const pathParts = path.split('/').filter(Boolean);

    // /register
    if (pathParts[0] === 'register') {
      return { route: 'register', params: {} };
    }

    // /boards/:boardCode?t=token
    if (pathParts[0] === 'boards' && pathParts[1]) {
      const params: Record<string, string> = { boardCode: pathParts[1] };

      // Parse query params
      if (search) {
        const searchParams = new URLSearchParams(search);
        searchParams.forEach((value, key) => {
          params[key] = value;
        });
      }

      return { route: 'board', params };
    }

    // /boards - user's board list (requires cookie)
    if (pathParts[0] === 'boards') {
      return { route: 'boardList', params: {} };
    }

    // /users/:userId/boards (legacy support)
    if (pathParts[0] === 'users' && pathParts[1] && pathParts[2] === 'boards') {
      return { route: 'boardList', params: { userId: pathParts[1] } };
    }

    // /home (old home screen with create/join functionality)
    if (pathParts[0] === 'home') {
      return { route: 'home', params: {} };
    }

    return { route: 'login', params: {} };
  }

  public navigate(path: string, replace: boolean = false): void {
    if (window.location.pathname === path) return;

    if (replace) {
      window.history.replaceState(null, '', path);
    } else {
      window.history.pushState(null, '', path);
    }
    this.handleRoute();
  }

  public async handleRoute(): Promise<void> {
    const { route, params } = this.parsePath();

    // Cleanup previous screen
    if (this.currentScreen && typeof (this.currentScreen as any).destroy === 'function') {
      (this.currentScreen as any).destroy();
    }
    this.currentScreen = null;

    // Clear container
    this.container.innerHTML = '';

    if (route === 'login') {
      this.renderLogin();
    } else if (route === 'register') {
      this.renderRegister();
    } else if (route === 'home') {
      this.renderHome();
    } else if (route === 'boardList') {
      this.renderBoardList(params.userId);
    } else if (route === 'board') {
      await this.renderBoard(params.boardCode, params.t);
    }
  }

  private renderLogin(): void {
    this.currentScreen = new ParticipantLogin(this.container);
  }

  private renderRegister(): void {
    this.currentScreen = new UserRegistration(this.container);
  }

  private renderHome(): void {
    this.currentScreen = new HomeScreen(this.container);
  }

  private renderBoardList(userId?: string): void {
    this.currentScreen = new BoardList(this.container, userId);
  }

  private async renderBoard(boardCode: string, editToken?: string): Promise<void> {
    // Show loading skeleton
    this.container.innerHTML = '<div class="board-loading">보드 로딩 중...</div>';

    try {
      // Load board data
      await state.loadBoard(boardCode, editToken);

      // Render board
      this.container.innerHTML = '';
      this.currentScreen = new ChoreBoardComponent(this.container);

      // Save to recent rooms
      const board = state.getBoard();
      if (board) {
        homeState.addRecentRoom({
          boardCode: board.boardCode,
          title: board.title,
          hasEdit: board.editable,
          lastVisited: Date.now(),
        });
      }
    } catch (error) {
      console.error('[Router] Failed to load board:', error);

      if (isNetworkError(error) && error.shouldShowNetworkPopup()) {
        showNetworkErrorPopup(error.getUserMessage(), () => this.renderBoard(boardCode, editToken));
      } else {
        this.container.innerHTML = `
          <div class="error-screen">
            <h2>⚠️ 보드를 불러올 수 없습니다</h2>
            <p>${error instanceof Error ? error.message : '알 수 없는 오류'}</p>
            <button onclick="window.dispatchEvent(new CustomEvent('navigate', { detail: { path: '/' } }))">홈으로 돌아가기</button>
          </div>
        `;
      }
    }
  }
}

// Helper function for navigation
export function navigateTo(path: string, replace: boolean = false): void {
  window.dispatchEvent(new CustomEvent('navigate', { detail: { path, replace } }));
}

// Initialize app
async function initializeApp() {
  const appContainer = document.querySelector<HTMLDivElement>('#app');
  if (!appContainer) {
    console.error('App container not found');
    return;
  }

  const router = new Router(appContainer);

  // Auto-login check
  try {
    // 쿠키가 있으면, 서버에 유효한지 확인
    await api.checkLoginStatus();

    // 사용자가 로그인했고 루트 경로에 있다면 /boards로 리디렉션합니다.
    if (window.location.pathname === '/' || window.location.pathname === '') {
      router.navigate('/boards', true);
      return;
    }
  } catch (error) {
    // 자동 로그인 실패 시 (쿠키 없거나 만료)
    console.info('[Auth] Auto-login failed. Proceeding with normal navigation.', error);

    // 보호 경로(/boards, /boards/:code)에 접근 중이라면 홈으로 보냄
    const path = window.location.pathname || '';
    if (path === '/boards' || path === '/boards/' || path.startsWith('/boards/')) {
      router.navigate('/', true);
      return;
    }
  }

  // 현재 경로에 맞게 라우터를 실행합니다.
  await router.handleRoute();
}

initializeApp();