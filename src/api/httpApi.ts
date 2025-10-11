import type { ChoreBoard, ChoreItem, User, CreateChoreItemDto, UpdateChoreItemDto } from '../models/types';
import { apiClient } from '../utils/apiClient';
import { formatDateForApi, parseApiDate } from '../utils/apiHelpers';

export interface CreateBoardResponse {
  boardCode: string;
  editToken: string;
  title: string;
}

export interface JoinBoardResponse {
  boardCode: string;
  title: string;
}

export interface UserBoardsResponse {
  boards: Array<{ code: string; title: string }>;
}

// ==================== Mapping Functions ====================

function mapParticipantToUser(participant: any): User {
  return {
    id: String(participant.id),
    nickname: participant.nickname,
    color: participant.color,
    userId: participant.userId ?? undefined,
  };
}

function mapApiItemToChoreItem(item: any): ChoreItem {
  return {
    id: String(item.id),
    title: item.title,
    assignee: item.assignee ? mapParticipantToUser(item.assignee) : null,
    completed: Boolean(item.isCompleted),
    createdAt: new Date(item.createdAt),
    completedAt: parseApiDate(item.completedAt),
    sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : undefined,
  };
}

function composeBoardFromApiResponse(boardData: any, itemsData: any): ChoreBoard {
  const members: User[] = (boardData.participants || []).map(mapParticipantToUser);
  const creator: User = members[0] || { id: '0', nickname: '알 수 없음', color: '#6b7280' };

  // Parse items from API response
  let items: any[] = [];
  if (Array.isArray(itemsData)) {
    items = itemsData;
  } else if (itemsData && typeof itemsData === 'object') {
    const incomplete = Array.isArray(itemsData.incomplete) ? itemsData.incomplete : [];
    const completed = Array.isArray(itemsData.completed) ? itemsData.completed : [];
    items = [...incomplete, ...completed];
  }

  // Map and sort items
  const mappedItems = items.map(mapApiItemToChoreItem).sort((a, b) => {
    const orderA = typeof a.sortOrder === 'number' ? a.sortOrder : Number.MAX_SAFE_INTEGER;
    const orderB = typeof b.sortOrder === 'number' ? b.sortOrder : Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  return {
    boardCode: String(boardData.boardCode),
    title: boardData.title,
    editable: true,
    creator,
    members,
    items: mappedItems,
    createdAt: new Date(boardData.createdAt),
    updatedAt: new Date(boardData.createdAt), // API doesn't provide updatedAt
    isRemove: boardData.isRemove ?? false,
  };
}

// ==================== HTTP API Class (리팩토링: apiClient 사용) ====================

class HttpAPI {
  /**
   * Creates a new board
   */
  async createBoard(title: string = '새 보드'): Promise<CreateBoardResponse> {
    const data = await apiClient.post('/boards', { title });

    return {
      boardCode: String(data.boardCode),
      editToken: data.editToken,
      title: data.title || title,
    };
  }

  /**
   * Validates a board code exists
   */
  async validateBoardCode(boardCode: string): Promise<JoinBoardResponse> {
    const data = await apiClient.get(`/boards/${boardCode}`);

    return {
      boardCode: String(data.boardCode),
      title: data.title,
    };
  }

  /**
   * Fetches board details with today's chores
   * TODO: editToken 처리 방식 개선 필요 (현재는 X-Edit-Token 헤더 사용)
   */
  async fetchBoardWithChores(boardCode: string, editToken?: string): Promise<ChoreBoard> {
    const date = formatDateForApi();
    const headers = editToken ? { 'X-Edit-Token': editToken } : undefined;

    const [boardData, itemsData] = await Promise.all([
      apiClient.get(`/boards/${boardCode}`, headers),
      apiClient.get(`/boards/${boardCode}/chores?date=${encodeURIComponent(date)}`, headers),
    ]);

    const board = composeBoardFromApiResponse(boardData, itemsData);
    board.editable = !!editToken;
    // isRemove는 서버에서 받은 값 그대로 사용 (더 이상 덮어쓰지 않음)
    return board;
  }

  /**
   * Creates a new chore item
   */
  async createChoreItem(boardCode: string, dto: CreateChoreItemDto): Promise<ChoreItem> {
    const data = await apiClient.post(`/boards/${boardCode}/chores`, {
      date: formatDateForApi(),
      title: dto.title,
      assigneeId: dto.assigneeId ?? null,
      options: null,
    });

    return mapApiItemToChoreItem(data);
  }

  /**
   * Updates a chore item
   */
  async updateChoreItem(boardCode: string, itemId: string, dto: UpdateChoreItemDto): Promise<ChoreItem> {
    const body: any = {};
    if (dto.title !== undefined) body.title = dto.title;
    if (dto.assigneeId !== undefined) body.assigneeId = dto.assigneeId;

    const data = await apiClient.put(`/boards/${boardCode}/chores/${itemId}`, body);
    return mapApiItemToChoreItem(data);
  }

  /**
   * Toggles chore item completion status
   */
  async toggleChoreCompletion(boardCode: string, itemId: string): Promise<ChoreItem> {
    const data = await apiClient.patch(`/boards/${boardCode}/chores/${itemId}/complete`);
    return mapApiItemToChoreItem(data);
  }

  /**
   * Deletes a chore item
   */
  async deleteChoreItem(boardCode: string, itemId: string): Promise<void> {
    await apiClient.delete(`/boards/${boardCode}/chores/${itemId}`);
  }

  /**
   * Updates chore item sort order
   */
  async updateChoreItemOrder(boardCode: string, itemId: string, sortOrder: number): Promise<void> {
    await apiClient.patch(`/boards/${boardCode}/chores/${itemId}/order`, { sortOrder });
  }

  /**
   * Bulk updates assignees for multiple chore items
   */
  async bulkUpdateAssignees(
    boardCode: string,
    items: Array<{ id: string; assigneeId: string | null }>
  ): Promise<void> {
    await apiClient.patch(`/boards/${boardCode}/chores/assignees`, {
      items: items.map(({ id, assigneeId }) => ({
        id: Number(id),
        assigneeId: assigneeId === null ? null : Number(assigneeId),
      })),
    });
  }

  /**
   * Checks if the user is currently logged in by fetching their profile.
   * Useful for session validation on app startup.
   */
  async checkLoginStatus(): Promise<{ user: any; boards: { boards: Array<{ code: string; title: string }> } }> {
    // 자동 리디렉션을 방지하기 위해 suppressAuthRedirect 플래그 사용
    // 백엔드에서 제공하는 새로운 토큰 유효성 검사 엔드포인트 사용
    return apiClient.get('/auth/status', undefined, true);
  }

  /**d
   * Fetches all boards for the authenticated user
   * Uses JWT token to identify user (extracted on backend from Authorization header)
   */
  async fetchUserBoards(): Promise<Array<{ boardCode: string; title: string }>> {
    const data = await apiClient.get<UserBoardsResponse>('/users/boards');

    if (!Array.isArray(data?.boards)) {
      return [];
    }

    return data.boards.map((board) => ({
      boardCode: String(board.code),
      title: board.title,
    }));
  }

  /**
   * Registers a new user and returns token+user
   */
  async registerUser(
    userId: string,
    nickname: string,
    color: string
  ): Promise<{ token: string; user: { userId: string; nickname: string; color: string; createdAt: string } }> {
    const data = await apiClient.post('/auth/register', { userId, nickname, color });

    return {
      token: String(data.token),
      user: data.user,
    };
  }

  /**
   * Login: returns token, user and boards
   * localStorage 방식: 응답에서 토큰을 받아 localStorage에 저장
   */
  async login(
    userId: string
  ): Promise<{ token: string; user: any; boards: { boards: Array<{ code: string; title: string }> } }> {
    return apiClient.post('/auth/login', { userId });
  }

  /**
   * Logout: localStorage에서 토큰 삭제
   * 서버에도 로그아웃 요청 전송 (선택사항)
   */
  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  }

  /**
   * Delete a board (creator only)
   */
  async deleteBoard(boardCode: string): Promise<void> {
    await apiClient.delete(`/boards/${boardCode}`);
  }

  /**
   * Joins a board as a participant
   * - 백엔드 가이드: Request Body에서 userId 제거 (JWT에서 추출)
   */
  async joinBoardAsParticipant(boardCode: string): Promise<JoinBoardResponse> {
    // First, validate the board exists
    const boardData = await this.validateBoardCode(boardCode);

    // Join as a participant (userId는 JWT 토큰에서 추출됨)
    await apiClient.post(`/boards/${boardCode}/participants`);

    return {
      boardCode: boardData.boardCode,
      title: boardData.title,
    };
  }
}

export const api = new HttpAPI();
