import type { ChoreItem, User } from '../models/types';
import { state } from '../utils/stateManager';
import { escapeHtml } from '../utils/domHelpers';
import { navigateTo } from '../utils/navigation';

export class ChoreBoardComponent {
  private container: HTMLElement;
  private isAdding = false;
  private eventListenersAttached = false;
  private draggingId: string | null = null;

  constructor(container: HTMLElement) {
    console.log('[ChoreBoard] Constructor called');
    this.container = container;
    this.setupEventDelegation();
    this.render();
    state.subscribe(() => this.render());
  }

  private setupEventDelegation(): void {
    if (this.eventListenersAttached) {
      console.log('[ChoreBoard] Event listeners already attached, skipping');
      return;
    }
    this.eventListenersAttached = true;

    console.log('[ChoreBoard] Setting up event delegation');
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
      console.log('[ChoreBoard] Submit event detected - preventing');
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
      console.log('[ChoreBoard] Add button clicked');
      await this.addItem();
      return;
    }

    // Random assign FAB
    if (target.closest('.random-fab')) {
      e.preventDefault();
      e.stopPropagation();
      if (confirm('미완료된 일들을 랜덤으로 배정하시겠습니까?')) {
        await state.randomAssign();
      }
      return;
    }

    // Info FAB
    if (target.closest('.info-fab')) {
      e.preventDefault();
      e.stopPropagation();
      alert('집안일 분배 앱 v1.0\n\n미완료된 일들을 팀원들에게 랜덤으로 배정할 수 있습니다.');
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
    const target = e.target as HTMLInputElement;

    // Close assignee picker on Escape
    if (e.key === 'Escape') {
      this.closeAssigneePicker();
    }

    // Add item on Enter
    if (target.id === 'new-item-title' && e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      console.log('[ChoreBoard] Enter key pressed');
      await this.addItem();
    }
  }

  private async addItem(): Promise<void> {
    if (this.isAdding) {
      console.log('[ChoreBoard] Already adding, skipping');
      return;
    }

    const titleInput = this.container.querySelector('#new-item-title') as HTMLInputElement;
    const assigneeSelect = this.container.querySelector('#new-item-assignee') as HTMLSelectElement;

    const title = titleInput?.value.trim();
    if (!title) return;

    console.log('[ChoreBoard] Adding item:', title);
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
      console.log('[ChoreBoard] Add complete');
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
    console.log('[ChoreBoard] Rendering...');
    const board = state.getBoard();
    if (!board) {
      this.container.innerHTML = '<div class="loading">Loading...</div>';
      return;
    }

    const uiState = state.getUIState();
    const incompleteItems = state.getIncompleteItems();
    const completedItems = state.getCompletedItems();
    console.log('[ChoreBoard] Items count - incomplete:', incompleteItems.length, 'completed:', completedItems.length);

    this.container.innerHTML = `
      <div class="chore-board">
        ${this.renderHeader(board.title, board.editable, board.creator.nickname, board.isRemove, board.createdAt)}
        ${this.renderIncompleteSection(incompleteItems, board.members)}
        ${this.renderCompletedSection(completedItems, uiState.completedSectionCollapsed)}
        ${this.renderInputBar(board.members)}
        ${this.renderFloatingActions()}
      </div>
    `;
  }

  private renderHeader(title: string, editable: boolean, creatorName: string, isRemove?: boolean, createdAt?: Date): string {
    const formattedDate = createdAt ? this.formatCreatedAt(createdAt) : '';
    console.log('[ChoreBoard] renderHeader - editable:', editable, 'isRemove:', isRemove);
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
    const timeStr = item.completedAt ? this.formatTime(item.completedAt) : '';
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
    return `
      <div class="floating-actions">
        <button class="fab info-fab" aria-label="Info" title="정보">ⓘ</button>
        <button class="fab random-fab" aria-label="Random assign" title="랜덤 배정">Ⓞ</button>
      </div>
    `;
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
      showToast(`코드:${board.boardCode} 복사 되었습니다.`, 'success');
    } catch (err) {
      console.error('[ChoreBoard] Failed to copy board code:', err);
      alert('클립보드 복사에 실패했습니다.');
    }
  }

  private async handleDeleteBoard(): Promise<void> {
    const board = state.getBoard();
    if (!board) return;

    console.log('[ChoreBoard] handleDeleteBoard - board:', board.boardCode, 'isRemove:', board.isRemove);

    // isRemove가 true일 때만 삭제 가능 (서버에서 권한 확인)
    if (!board.isRemove) {
      console.log('[ChoreBoard] Delete not allowed - isRemove is false');
      return;
    }

    this.showDeleteConfirmation(board);
  }

  private showDeleteConfirmation(board: { boardCode: string; title: string }): void {
    // 기존 팝업이 있다면 먼저 제거 (중복 방지)
    const existingOverlay = document.querySelector('.delete-dialog-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }

    const overlay = document.createElement('div');
    overlay.className = 'delete-dialog-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'delete-dialog';
    dialog.innerHTML = `
      <div class="delete-dialog-header">
        <h3>보드 삭제</h3>
      </div>
      <div class="delete-dialog-body">
        <p>삭제하시겠습니까?</p>
      </div>
      <div class="delete-dialog-footer">
        <button class="btn-secondary delete-cancel">취소</button>
        <button class="btn-danger delete-confirm">확인</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const cancelBtn = dialog.querySelector('.delete-cancel') as HTMLButtonElement;
    const confirmBtn = dialog.querySelector('.delete-confirm') as HTMLButtonElement;

    let isClosing = false; // 중복 닫기 방지 플래그

    // Escape key handler
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeDialog();
      }
    };

    // Overlay click handler
    const handleOverlayClick = (e: Event) => {
      if (e.target === overlay) {
        e.preventDefault();
        e.stopPropagation();
        closeDialog();
      }
    };

    // Cancel button handler
    const handleCancel = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      closeDialog();
    };

    // Confirm button handler
    const handleConfirm = async (e: Event) => {
      e.preventDefault();
      e.stopPropagation();

      if (confirmBtn.disabled) return; // 중복 클릭 방지

      confirmBtn.disabled = true;
      confirmBtn.textContent = '삭제 중...';

      try {
        const { api } = await import('../api/httpApi');
        await api.deleteBoard(board.boardCode);

        console.log('[ChoreBoard] Board deleted successfully');

        // 보드 목록 캐시에서 제거하여 목록 화면이 즉시 반영되도록 함
        try {
          const { getBoardsCache, saveBoardsCache } = await import('../utils/boardsCache');
          const cached = getBoardsCache();
          if (cached) {
            const next = cached.filter(b => b.code !== board.boardCode);
            saveBoardsCache(next);
            console.log('[ChoreBoard] Updated boards cache after delete. Before:', cached.length, 'After:', next.length);
          }
        } catch (e) {
          console.warn('[ChoreBoard] Failed to update boards cache after delete:', e);
        }

        // 팝업을 먼저 닫음
        closeDialog();

        // 팝업 DOM이 완전히 제거될 때까지 대기 후 페이지 이동
        await new Promise(resolve => setTimeout(resolve, 150));
        navigateTo('/boards');
      } catch (error) {
        console.error('[ChoreBoard] Failed to delete board:', error);
        confirmBtn.disabled = false;
        confirmBtn.textContent = '확인';
        closeDialog();

        const errorMessage = error instanceof Error ? error.message : '보드 삭제에 실패했습니다';
        alert(`보드 삭제 실패: ${errorMessage}`);
      }
    };

    const closeDialog = () => {
      if (isClosing) return; // 이미 닫히는 중이면 무시
      isClosing = true;

      // 모든 이벤트 리스너 제거
      document.removeEventListener('keydown', handleEscape);
      overlay.removeEventListener('click', handleOverlayClick);
      cancelBtn.removeEventListener('click', handleCancel);
      confirmBtn.removeEventListener('click', handleConfirm);

      overlay.remove();
    };

    // 이벤트 리스너 등록
    document.addEventListener('keydown', handleEscape);
    overlay.addEventListener('click', handleOverlayClick);
    cancelBtn.addEventListener('click', handleCancel);
    confirmBtn.addEventListener('click', handleConfirm);

    // Show dialog with animation
    setTimeout(() => {
      overlay.classList.add('show');
    }, 10);
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

  private formatTime(date: Date): string {
    try {
      const f = new Intl.DateTimeFormat('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Seoul',
      });
      // Intl returns like "오전 09:30" if hour12 true; with hour12 false we get 09:30
      return f.format(date);
    } catch (e) {
      // Fallback to local time if Intl/timeZone not supported
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    }
  }

  private formatCreatedAt(date: Date): string {
    try {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const seconds = date.getSeconds().toString().padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    } catch (e) {
      return '';
    }
  }
}
