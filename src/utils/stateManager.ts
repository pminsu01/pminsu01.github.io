import type { ChoreBoard, ChoreItem, UIState, User } from '../models/types';
import { api } from '../api/httpApi';

export class ChoreboardState {
  private board: ChoreBoard | null = null;
  private uiState: UIState = {
    completedSectionCollapsed: false,
    searchQuery: '',
  };
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadUIState();
  }

  private loadUIState(): void {
    const stored = localStorage.getItem('uiState');
    if (stored) {
      this.uiState = JSON.parse(stored);
    }
  }

  private saveUIState(): void {
    localStorage.setItem('uiState', JSON.stringify(this.uiState));
  }

  subscribe(listener: () => void): () => void {
    console.log('[StateManager] Subscriber added, total listeners:', this.listeners.size + 1);
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    console.log('[StateManager] Notifying', this.listeners.size, 'listeners');
    this.listeners.forEach(listener => listener());
  }

  async loadBoard(boardCode: string, editToken?: string): Promise<void> {
    this.board = await api.fetchBoardWithChores(boardCode, editToken);
    this.invalidateCache();
    this.notify();
  }

  getBoard(): ChoreBoard | null {
    return this.board;
  }

  getUIState(): UIState {
    return { ...this.uiState };
  }

  private incompleteItemsCache: ChoreItem[] | null = null;
  private completedItemsCache: ChoreItem[] | null = null;

  private invalidateCache(): void {
    this.incompleteItemsCache = null;
    this.completedItemsCache = null;
  }

  getIncompleteItems(): ChoreItem[] {
    if (!this.board) return [];

    // Use cached result if available
    if (this.incompleteItemsCache) {
      return this.incompleteItemsCache;
    }

    this.incompleteItemsCache = this.board.items
      .filter(item => !item.completed)
      .sort((a, b) => {
        const ao = typeof a.sortOrder === 'number' ? a.sortOrder : Number.MAX_SAFE_INTEGER;
        const bo = typeof b.sortOrder === 'number' ? b.sortOrder : Number.MAX_SAFE_INTEGER;
        if (ao !== bo) return ao - bo;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

    return this.incompleteItemsCache;
  }

  getCompletedItems(): ChoreItem[] {
    if (!this.board) return [];

    // Use cached result if available
    if (this.completedItemsCache) {
      return this.completedItemsCache;
    }

    this.completedItemsCache = this.board.items
      .filter(item => item.completed)
      .sort((a, b) => {
        const timeA = a.completedAt?.getTime() || 0;
        const timeB = b.completedAt?.getTime() || 0;
        return timeB - timeA; // Most recent first
      });

    return this.completedItemsCache;
  }

  toggleCompletedSection(): void {
    this.uiState.completedSectionCollapsed = !this.uiState.completedSectionCollapsed;
    this.saveUIState();
    this.notify();
  }

  async toggleItemComplete(itemId: string): Promise<void> {
    if (!this.board) return;
    const updatedItem = await api.toggleChoreCompletion(this.board.boardCode, itemId);
    const index = this.board.items.findIndex(i => i.id === itemId);
    if (index !== -1) {
      this.board.items[index] = updatedItem;
      this.invalidateCache();
      this.notify();
    }
  }

  async addItem(title: string, assigneeId?: string): Promise<void> {
    if (!this.board) return;
    console.log('[StateManager] addItem called:', title, 'assigneeId:', assigneeId);
    const newItem = await api.createChoreItem(this.board.boardCode, { title, assigneeId });
    // Optimistically attach assignee if server response lacks it
    if (!newItem.assignee && assigneeId) {
      const member = this.board.members.find(m => m.id === assigneeId) || null;
      if (member) {
        newItem.assignee = member;
      }
    }
    console.log('[StateManager] API returned:', newItem);
    this.board.items.push(newItem);
    this.invalidateCache();
    this.notify();
  }

  async deleteItem(itemId: string): Promise<void> {
    if (!this.board) return;
    await api.deleteChoreItem(this.board.boardCode, itemId);
    this.board.items = this.board.items.filter(i => i.id !== itemId);
    this.invalidateCache();
    this.notify();
  }

  async updateBoardTitle(title: string): Promise<void> {
    if (!this.board) return;
    // Note: This is a client-side only operation as the backend doesn't support board title updates
    this.board.title = title;
    this.notify();
  }

  async randomAssign(): Promise<void> {
    if (!this.board) return;
    const members = this.board.members;
    if (!members || members.length === 0) {
      return; // nothing to assign
    }

    // Work only with incomplete items
    const incomplete = this.getIncompleteItems();
    if (incomplete.length === 0) {
      return;
    }

    // Split into already-assigned and unassigned
    const unassigned: ChoreItem[] = [];
    const assigned: ChoreItem[] = [];
    for (const it of incomplete) {
      if (it.assignee) assigned.push(it); else unassigned.push(it);
    }
    if (unassigned.length === 0) {
      return; // nothing to do
    }

    // Initialize load per member from already-assigned incomplete items
    const load = new Map<string, number>();
    members.forEach(m => load.set(m.id, 0));
    for (const it of assigned) {
      if (it.assignee) {
        load.set(it.assignee.id, (load.get(it.assignee.id) || 0) + 1);
      }
    }

    // Helper: shuffle array (Fisher-Yates)
    function shuffle<T>(arr: T[]): T[] {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    const shuffledMembers = shuffle(members);
    const shuffledUnassigned = shuffle(unassigned);

    // Decide assignments to balance loads fairly
    const decided: { item: ChoreItem; memberId: string }[] = [];
    for (const item of shuffledUnassigned) {
      // choose member with smallest load; tie-break by shuffledMembers order
      let bestMember = shuffledMembers[0];
      let bestLoad = Number.POSITIVE_INFINITY;
      for (const m of shuffledMembers) {
        const l = load.get(m.id) ?? 0;
        if (l < bestLoad) {
          bestLoad = l;
          bestMember = m;
        }
      }
      decided.push({ item, memberId: bestMember.id });
      load.set(bestMember.id, (load.get(bestMember.id) || 0) + 1);
    }

    // Apply locally (optimistic update)
    const idToMember = new Map<string, User>();
    members.forEach(m => idToMember.set(m.id, m));
    for (const { item, memberId } of decided) {
      const idx = this.board.items.findIndex(i => i.id === item.id);
      if (idx !== -1) {
        this.board.items[idx] = { ...this.board.items[idx], assignee: idToMember.get(memberId) || null };
      }
    }
    this.invalidateCache();
    this.notify();

    // Persist to server in bulk (fire-and-forget)
    try {
      await api.bulkUpdateAssignees(this.board.boardCode, decided.map(d => ({ id: d.item.id, assigneeId: d.memberId })));
      // Keep UI as-is regardless of response; no further action required.
    } catch (e) {
      console.warn('[StateManager] Failed to persist random assignment in bulk:', e);
      // keep local optimistic assignment
    }
  }

  async updateItemAssignee(itemId: string, assigneeId: string | null): Promise<void> {
    if (!this.board) return;
    // Optimistic local update
    const idx = this.board.items.findIndex(i => i.id === itemId);
    if (idx === -1) return;
    const members = this.board.members || [];
    const idToMember = new Map<string, User>();
    members.forEach(m => idToMember.set(m.id, m));
    const nextAssignee = assigneeId ? (idToMember.get(assigneeId) || null) : null;
    this.board.items[idx] = { ...this.board.items[idx], assignee: nextAssignee };
    this.invalidateCache();
    this.notify();

    // Persist via bulk endpoint with single-item list
    try {
      await api.bulkUpdateAssignees(this.board.boardCode, [{ id: itemId, assigneeId }]);
    } catch (e) {
      console.warn('[StateManager] Failed to update assignee on server:', e);
      // keep optimistic UI; optionally could refresh board here
    }
  }

  async updateItemTitle(itemId: string, title: string): Promise<void> {
    if (!this.board) return;
    const updatedItem = await api.updateChoreItem(this.board.boardCode, itemId, { title });
    const index = this.board.items.findIndex(i => i.id === itemId);
    if (index !== -1) {
      // Preserve local sortOrder if API doesn't return it
      const prevOrder = this.board.items[index].sortOrder;
      this.board.items[index] = { ...updatedItem, sortOrder: updatedItem.sortOrder ?? prevOrder };
      this.invalidateCache();
      this.notify();
    }
  }

  // Optimistic reorder of incomplete items; newIndex is 0-based among incomplete items
  async reorderIncomplete(itemId: string, newIndex: number): Promise<void> {
    if (!this.board) return;
    const incomplete = this.getIncompleteItems();
    const fromIndex = incomplete.findIndex(i => i.id === itemId);
    if (fromIndex === -1) return;
    const clampedNewIndex = Math.max(0, Math.min(newIndex, incomplete.length - 1));
    if (fromIndex === clampedNewIndex) return;

    // Build new order of ids
    const newOrder = incomplete.map(i => i.id);
    const [moved] = newOrder.splice(fromIndex, 1);
    newOrder.splice(clampedNewIndex, 0, moved);

    // Apply new sortOrder locally (1..n)
    const idToOrder = new Map<string, number>();
    newOrder.forEach((id, idx) => idToOrder.set(id, idx + 1));

    this.board.items = this.board.items.map(it => {
      if (it.completed) return it;
      const so = idToOrder.get(it.id);
      return { ...it, sortOrder: so ?? it.sortOrder };
    });

    this.invalidateCache();
    this.notify();

    // Fire-and-forget API call for the moved item only
    const newSortOrder = idToOrder.get(itemId)!;
    try {
      await api.updateChoreItemOrder(this.board.boardCode, itemId, newSortOrder);
    } catch (e) {
      console.warn('[StateManager] Failed to update order on server, keeping local order:', e);
    }
  }
}

export const state = new ChoreboardState();
