export interface User {
  id: string;
  nickname: string;
  avatar?: string;
  color?: string;
  userId?: string; // backend userId (for auth/creator detection)
}

export interface ChoreItem {
  id: string;
  title: string;
  assignee: User | null;
  completed: boolean;
  completedAt?: Date;
  createdAt: Date;
  sortOrder?: number; // 낮을수록 위에, 미완료 정렬 기준
}

export interface ChoreBoard {
  boardCode: string;
  title: string;
  editable: boolean;
  creator: User;
  members: User[];
  items: ChoreItem[];
  createdAt: Date;
  updatedAt: Date;
  isRemove?: boolean;
}

export interface UIState {
  completedSectionCollapsed: boolean;
  searchQuery: string;
}

export interface CreateChoreItemDto {
  title: string;
  assigneeId?: string;
}

export interface UpdateChoreItemDto {
  title?: string;
  assigneeId?: string | null;
  completed?: boolean;
}
