import type { ChoreItem, User } from '../models/types';
import { state } from '../utils/stateManager';
import { escapeHtml } from '../utils/domHelpers';
import { navigateTo } from '../utils/navigation';
import { formatTime, formatDateTime } from '../utils/dateHelpers';
import { createDialog } from '../utils/dialogHelpers';
import { setupEnterKeyHandler } from '../utils/inputHelpers';

export class ChoreBoardComponent {
  private container: HTMLElement;
  private isAdding = false;
  private eventListenersAttached = false;
  private draggingId: string | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.setupEventDelegation();
    this.render();
    state.subscribe(() => this.render());
  }

  private setupEventDelegation(): void {
    if (this.eventListenersAttached) {
      return;
    }
    this.eventListenersAttached = true;
    // Use event delegation on container
    this.container.addEventListener('click', this.handleClick.bind(this));
    this.container.addEventListener('change', this.handleChange.bind(this));
    this.container.addEventListener('keypress', this.handleKeyPress.bind(this));
    // Drag & Drop events
    this.container.addEventListener('dragstart', this.handleDragStart.bind(this));
    this.container.addEventListener('dragover', this.handleDragOver.bind(this));
    this.container.addEventListener('drop', this.handleDrop.bind(this));
    this.container.addEventListener('dragend', this.handleDragEnd.bind(this));

    this.container.addEventListener('submit', (e) => {
      e.preventDefault();
    });
  }

  private async handleClick(e: Event): Promise<void> {
    const target = e.target as HTMLElement;

    // Back button
    if (target.closest('.back-button')) {
      e.preventDefault();
      navigateTo('/boards');
      return;
    }

    // Toggle completed section
    if (target.closest('[data-toggle-completed]')) {
      e.preventDefault();
      state.toggleCompletedSection();
      return;
    }

    // Add item button
    if (target.id === 'add-item-btn' || target.closest('#add-item-btn')) {
      e.preventDefault();
      e.stopPropagation();
      await this.addItem();
      return;
    }

    // Random assign button
    if (target.closest('.random-assign-btn')) {
      e.preventDefault();
      e.stopPropagation();
      if (confirm('미분배된 일들을 복불복으로 배정하시겠습니까?')) {
        await state.randomAssign();
      }
      return;
    }

    // Delete button
    if (target.closest('.delete-button')) {
      e.preventDefault();
      e.stopPropagation();
      const btn = target.closest('.delete-button') as HTMLElement;
      const itemId = btn.dataset.itemId;
      if (!itemId) return;
      if (confirm('이 항목을 삭제하시겠습니까?')) {
        await state.deleteItem(itemId);
      }
      return;
    }

    // Assignee badge click (open button-based picker on incomplete items)
    if (target.closest('.assignee-badge')) {
      const badge = target.closest('.assignee-badge') as HTMLElement;
      const itemEl = badge.closest('.chore-item');
      if (!itemEl || itemEl.classList.contains('completed')) {
        return; // do nothing for completed items
      }
      const itemId = itemEl.getAttribute('data-item-id');
      if (!itemId) return;
      this.openAssigneePicker(itemId);
      return;
    }

    // Assignee picker interactions
    const optionBtn = target.closest('.assignee-option') as HTMLElement | null;
    if (optionBtn && optionBtn.dataset.assigneeId !== undefined) {
      const modal = optionBtn.closest('[data-assignee-modal]') as HTMLElement | null;
      const itemId = modal?.dataset.itemId || null;
      if (itemId) {
        const value = optionBtn.dataset.assigneeId || '';
        const assigneeId = value === '' ? null : value;
        await state.updateItemAssignee(itemId, assigneeId);
      }
      this.closeAssigneePicker();
      return;
    }

    if (target.closest('[data-modal-close]')) {
      this.closeAssigneePicker();
      return;
    }

    // Click on item title to edit (incomplete items only)
    if (target.closest('.item-title')) {
      const titleEl = target.closest('.item-title') as HTMLElement;
      const itemEl = titleEl.closest('.chore-item');
      if (!itemEl || itemEl.classList.contains('completed')) {
        // ignore for completed items
        return;
      }
      const itemId = itemEl.getAttribute('data-item-id');
      if (!itemId) return;
      this.startEditItemTitle(itemId, titleEl);
      return;
    }

    // Edit icon or title
    if (target.closest('.edit-icon') || target.closest('.board-title[data-editable="true"]')) {
      this.startEditing();
      return;
    }

    // Share button
    if (target.closest('.share-button')) {
      await this.handleShareBoard();
      return;
    }

    // Delete board button
    if (target.closest('.delete-board-button')) {
      await this.handleDeleteBoard();
      return;
    }
  }

  private async handleChange(e: Event): Promise<void> {
    const target = e.target as HTMLInputElement;

    // Checkbox toggle
    if (target.classList.contains('item-checkbox')) {
      const itemId = target.dataset.itemId;
      if (itemId) {
        await state.toggleItemComplete(itemId);
      }
    }
  }

  private async handleKeyPress(e: KeyboardEvent): Promise<void> {
    // Close assignee picker on Escape
    if (e.key === 'Escape') {
      this.closeAssigneePicker();
    }

    // Note: Enter key handling for new-item-title is done in setupInputListeners
  }

  private async addItem(): Promise<void> {
    if (this.isAdding) {
      return;
    }

    const titleInput = this.container.querySelector('#new-item-title') as HTMLInputElement;
    const assigneeSelect = this.container.querySelector('#new-item-assignee') as HTMLSelectElement;

    const title = titleInput?.value.trim();
    if (!title) return;

    this.isAdding = true;

    // Get values before clearing
    const assigneeId = assigneeSelect?.value || undefined;

    // Clear inputs immediately
    if (titleInput) titleInput.value = '';
    if (assigneeSelect) assigneeSelect.value = '';

    try {
      await state.addItem(title, assigneeId);
    } finally {
      this.isAdding = false;
    }
  }

  private startEditing(): void {
    const titleEl = this.container.querySelector('.board-title') as HTMLElement;
    if (titleEl?.dataset.editable !== 'true') return;

    const currentTitle = titleEl.textContent || '';
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentTitle;
    input.className = 'title-edit-input';

    const save = async () => {
      const newTitle = input.value.trim();
      if (newTitle && newTitle !== currentTitle) {
        await state.updateBoardTitle(newTitle);
      } else {
        this.render();
      }
    };

    input.addEventListener('blur', save);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        save();
      }
    });

    titleEl.replaceWith(input);
    input.focus();
    input.select();
  }

  private startEditItemTitle(itemId: string, titleEl: HTMLElement): void {
    const current = titleEl.textContent || '';
    const input = document.createElement('input');
    input.type = 'text';
    input.value = current;
    input.className = 'item-title-input';

    const save = async () => {
      const next = input.value.trim();
      if (next && next !== current) {
        await state.updateItemTitle(itemId, next);
      } else {
        this.render();
      }
    };

    const cancel = () => {
      this.render();
    };

    input.addEventListener('blur', save);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        save();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
      }
    });

    titleEl.replaceWith(input);
    input.focus();
    input.select();
  }

  private render(): void {
    const board = state.getBoard();
    if (!board) {
      this.container.innerHTML = '<div class="loading">Loading...</div>';
      return;
    }

    const uiState = state.getUIState();
    const incompleteItems = state.getIncompleteItems();
    const completedItems = state.getCompletedItems();

    this.container.innerHTML = `
      <div class="chore-board">
        ${this.renderHeader(board.title, board.editable, board.creator.nickname, board.isRemove, board.createdAt)}
        ${this.renderIncompleteSection(incompleteItems, board.members)}
        ${this.renderCompletedSection(completedItems, uiState.completedSectionCollapsed)}
        ${this.renderInputBar(board.members)}
        ${this.renderFloatingActions()}
      </div>
    `;

    // Setup Korean input handling for new item input
    this.setupInputListeners();
  }

  private setupInputListeners(): void {
    const titleInput = this.container.querySelector('#new-item-title') as HTMLInputElement;
    if (titleInput) {
      setupEnterKeyHandler(titleInput, () => this.addItem());
    }
  }

  private renderHeader(title: string, editable: boolean, creatorName: string, isRemove?: boolean, createdAt?: Date): string {
    const formattedDate = createdAt ? formatDateTime(createdAt) : '';
    return `
      <div class="board-header">
        <div class="header-top">
          <button class="back-button" aria-label="Back">◀</button>
          <div class="title-container">
            <h1 class="board-title" data-editable="${editable}">${escapeHtml(title)}</h1>
            ${editable ? '<button class="edit-icon" aria-label="Edit title">✏️</button>' : ''}
          </div>
          <div class="header-actions">
            <button class="share-button">공유</button>
            ${isRemove ? '<button class="delete-board-button" aria-label="Delete board">삭제</button>' : ''}
          </div>
        </div>
        <div class="creator-info">
          <span class="creator-name">${escapeHtml(creatorName)}</span>
          ${formattedDate ? `<span class="creator-date">${formattedDate}</span>` : ''}
        </div>
      </div>
    `;
  }

  private renderIncompleteSection(items: ChoreItem[], _members: User[]): string {
    return `
      <div class="section incomplete-section">
        <div class="section-header">
          <h2>미완료 (${items.length})</h2>
          <button class="random-assign-btn" aria-label="Random assign" title="무작위">랜덤 배정</button>
        </div>
        <div class="items-list">
          ${items.length === 0 ? '<div class="empty-state">해야할 일이 없습니다</div>' : ''}
          ${items.map(item => this.renderChoreItem(item, false)).join('')}
        </div>
      </div>
    `;
  }

  private renderCompletedSection(items: ChoreItem[], collapsed: boolean): string {
    return `
      <div class="section completed-section ${collapsed ? 'collapsed' : ''}">
        <div class="section-header" data-toggle-completed>
          <h2>완료 (${items.length})</h2>
          <button class="collapse-toggle" aria-label="Toggle completed section">
            ${collapsed ? '⌃' : '⌄'}
          </button>
        </div>
        <div class="items-list" style="display: ${collapsed ? 'none' : 'block'}">
          ${items.length === 0 ? '<div class="empty-state">완료된 일이 없습니다</div>' : ''}
          ${items.map(item => this.renderChoreItem(item, true)).join('')}
        </div>
      </div>
    `;
  }

  private renderChoreItem(item: ChoreItem, isCompleted: boolean): string {
    const timeStr = item.completedAt ? formatTime(item.completedAt) : '';
    const assigneeBadge = item.assignee
      ? `<span class=\"assignee-badge ${isCompleted ? '' : 'clickable'}\" data-item-id=\"${item.id}\" style=\"background-color: ${item.assignee.color}\">${escapeHtml(item.assignee.nickname)}</span>`
      : `<span class=\"assignee-badge unassigned ${isCompleted ? '' : 'clickable'}\" data-item-id=\"${item.id}\">미배정</span>`;

    return `
      <div class=\"chore-item ${isCompleted ? 'completed' : ''}\" data-item-id=\"${item.id}\" ${!isCompleted ? 'draggable=\"true\"' : ''}>
        <input
          type=\"checkbox\"
          class=\"item-checkbox\"
          ${isCompleted ? 'checked' : ''}
          data-item-id=\"${item.id}\"
        />
        <span class=\"item-title\">${escapeHtml(item.title)}</span>
        ${assigneeBadge}
        ${isCompleted ? `<span class=\"timestamp\">${timeStr}</span>` : ''}
        ${!isCompleted ? `<button class=\"delete-button\" data-item-id=\"${item.id}\" aria-label=\"Delete\">❌</button>` : ''}
      </div>
    `;
  }

  private renderInputBar(members: User[]): string {
    return `
      <div class="input-bar">
        <div class="input-icon">+</div>
        <input
          type="text"
          class="title-input"
          placeholder="새 집안일 추가"
          id="new-item-title"
        />
        <select class="assignee-select" id="new-item-assignee">
          <option value="">담당자 선택</option>
          ${members.map(m => `<option value="${m.id}">${escapeHtml(m.nickname)}</option>`).join('')}
        </select>
        <button type="button" class="add-button" id="add-item-btn">추가</button>
      </div>
    `;
  }

  private renderFloatingActions(): string {
    return '';
  }

  // Opens a simple modal with buttons to pick an assignee
  private openAssigneePicker(itemId: string): void {
    this.closeAssigneePicker();
    const board = state.getBoard();
    const members = board?.members || [];

    const overlay = document.createElement('div');
    overlay.className = 'assignee-modal-overlay';
    overlay.setAttribute('data-assignee-modal', '');
    overlay.setAttribute('data-item-id', itemId);

    // Build options
    const optionsHtml = [
      `<button type="button" class="assignee-option unassigned" data-assignee-id="">미배정</button>`,
      ...members.map(m => `
        <button type="button" class="assignee-option" data-assignee-id="${m.id}">
          <span class="color-dot" style="background-color: ${m.color}"></span>
          ${escapeHtml(m.nickname)}
        </button>
      `),
    ].join('');

    overlay.innerHTML = `
      <div class="assignee-modal-backdrop" data-modal-close></div>
      <div class="assignee-modal" role="dialog" aria-label="담당자 선택">
        <div class="assignee-modal-header">담당자 선택</div>
        <div class="assignee-options">${optionsHtml}</div>
        <div class="assignee-modal-actions">
          <button class="close-button" type="button" data-modal-close>닫기</button>
        </div>
      </div>
    `;

    this.container.appendChild(overlay);

    // Focus first option for accessibility
    const firstBtn = overlay.querySelector('.assignee-option') as HTMLButtonElement | null;
    firstBtn?.focus();
  }

  private closeAssigneePicker(): void {
    const existing = this.container.querySelector('[data-assignee-modal]');
    if (existing) existing.remove();
  }

  private async handleShareBoard(): Promise<void> {
    const board = state.getBoard();
    if (!board) return;

    try {
      await navigator.clipboard.writeText(board.boardCode);
      const { showToast } = await import('../utils/domHelpers');
      showToast(`코드: ${board.boardCode} 복사 되었습니다.`, 'success');
    } catch (err) {
      alert('클립보드 복사에 실패했습니다.');
    }
  }

  private async handleDeleteBoard(): Promise<void> {
    const board = state.getBoard();
    if (!board) return;

    // isRemove가 true일 때만 삭제 가능 (서버에서 권한 확인)
    if (!board.isRemove) {
      return;
    }

    this.showDeleteConfirmation(board);
  }

  private showDeleteConfirmation(board: { boardCode: string; title: string }): void {
    createDialog({
      title: '보드 삭제',
      message: '삭제하시겠습니까?',
      confirmText: '확인',
      cancelText: '취소',
      isDangerous: true,
      onConfirm: async () => {
        const { api } = await import('../api/httpApi');
        await api.deleteBoard(board.boardCode);

        // 팝업 DOM이 완전히 제거될 때까지 대기 후 페이지 이동
        await new Promise(resolve => setTimeout(resolve, 150));
        navigateTo('/boards');
      },
    });
  }

  // Drag & Drop handlers
  private handleDragStart(e: DragEvent): void {
    const target = e.target as HTMLElement;
    const itemEl = target.closest('.chore-item') as HTMLElement | null;
    const listEl = target.closest('.incomplete-section .items-list');
    if (!itemEl || !listEl || itemEl.classList.contains('completed')) return;
    const itemId = itemEl.getAttribute('data-item-id');
    if (!itemId) return;
    this.draggingId = itemId;
    itemEl.classList.add('dragging');
    try {
      e.dataTransfer?.setData('text/plain', itemId);
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    } catch (_) {}
  }

  private handleDragOver(e: DragEvent): void {
    const target = e.target as HTMLElement;
    const listEl = target.closest('.incomplete-section .items-list');
    if (!listEl || !this.draggingId) return;
    e.preventDefault(); // allow drop
    const overItem = target.closest('.chore-item') as HTMLElement | null;
    // Add hover indicator
    listEl.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    if (overItem && !overItem.classList.contains('completed')) {
      overItem.classList.add('drag-over');
    }
  }

  private handleDrop(e: DragEvent): void {
    const target = e.target as HTMLElement;
    const listEl = target.closest('.incomplete-section .items-list');
    if (!listEl || !this.draggingId) return;
    e.preventDefault();

    const overItem = target.closest('.chore-item') as HTMLElement | null;
    const items = state.getIncompleteItems();

    let newIndex = items.length - 1; // default drop to end
    if (overItem) {
      const overId = overItem.getAttribute('data-item-id');
      const idx = items.findIndex(i => i.id === overId);
      if (idx !== -1) newIndex = idx;
    }

    const fromIndex = items.findIndex(i => i.id === this.draggingId);
    if (fromIndex !== -1) {
      state.reorderIncomplete(this.draggingId, newIndex);
    }
  }

  private handleDragEnd(_e: DragEvent): void {
    // Clean visual states
    this.container.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
    this.container.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    this.draggingId = null;
  }

}
