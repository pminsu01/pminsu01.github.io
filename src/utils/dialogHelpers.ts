/**
 * Reusable dialog utilities
 * Centralized dialog creation to avoid duplication across components
 */

import { escapeHtml } from './domHelpers';

export interface DialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

/**
 * Creates a modal dialog with customizable buttons
 * Returns cleanup function
 */
export function createDialog(options: DialogOptions): () => void {
  const {
    title = '확인',
    message,
    confirmText = '확인',
    cancelText = '취소',
    isDangerous = false,
    onConfirm,
    onCancel,
  } = options;

  // Remove existing dialog to prevent duplicates
  const existingOverlay = document.querySelector('.dialog-overlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }

  const overlay = document.createElement('div');
  overlay.className = 'dialog-overlay popup-overlay';

  const dialog = document.createElement('div');
  dialog.className = 'dialog popup-dialog';
  dialog.innerHTML = `
    <div class="dialog-header popup-header">
      <h3>${escapeHtml(title)}</h3>
    </div>
    <div class="dialog-body popup-body">
      <p>${escapeHtml(message)}</p>
    </div>
    <div class="dialog-footer popup-footer">
      ${onCancel || !onConfirm ? `<button class="btn-secondary dialog-cancel">${escapeHtml(cancelText)}</button>` : ''}
      <button class="${isDangerous ? 'btn-danger' : 'btn-primary'} dialog-confirm">${escapeHtml(confirmText)}</button>
    </div>
  `;

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  const cancelBtn = dialog.querySelector('.dialog-cancel') as HTMLButtonElement;
  const confirmBtn = dialog.querySelector('.dialog-confirm') as HTMLButtonElement;

  let isClosing = false;

  const closeDialog = () => {
    if (isClosing) return;
    isClosing = true;

    document.removeEventListener('keydown', handleEscape);
    overlay.removeEventListener('click', handleOverlayClick);
    overlay.remove();
  };

  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel?.();
      closeDialog();
    }
  };

  const handleOverlayClick = (e: Event) => {
    if (e.target === overlay) {
      e.preventDefault();
      e.stopPropagation();
      onCancel?.();
      closeDialog();
    }
  };

  const handleCancel = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    onCancel?.();
    closeDialog();
  };

  const handleConfirm = async (e: Event) => {
    e.preventDefault();
    e.stopPropagation();

    if (!onConfirm || confirmBtn.disabled) return;

    confirmBtn.disabled = true;
    confirmBtn.textContent = '처리 중...';

    try {
      await onConfirm();
      closeDialog();
    } catch (error) {
      confirmBtn.disabled = false;
      confirmBtn.textContent = confirmText;
      // Keep dialog open on error
    }
  };

  document.addEventListener('keydown', handleEscape);
  overlay.addEventListener('click', handleOverlayClick);
  cancelBtn?.addEventListener('click', handleCancel);
  confirmBtn.addEventListener('click', handleConfirm);

  // Show with animation
  setTimeout(() => overlay.classList.add('show'), 10);

  return closeDialog;
}

/**
 * Creates an input dialog for text entry
 */
export interface InputDialogOptions {
  title: string;
  placeholder?: string;
  defaultValue?: string;
  maxLength?: number;
  confirmText?: string;
  cancelText?: string;
  onConfirm: (value: string) => void | Promise<void>;
  onCancel?: () => void;
}

export function createInputDialog(options: InputDialogOptions): () => void {
  const {
    title,
    placeholder = '',
    defaultValue = '',
    maxLength = 50,
    confirmText = '확인',
    cancelText = '취소',
    onConfirm,
    onCancel,
  } = options;

  const overlay = document.createElement('div');
  overlay.className = 'dialog-overlay title-dialog-overlay';

  overlay.innerHTML = `
    <div class="dialog title-dialog">
      <h3>${escapeHtml(title)}</h3>
      <input
        type="text"
        class="dialog-input title-dialog-input"
        placeholder="${escapeHtml(placeholder)}"
        maxlength="${maxLength}"
        value="${escapeHtml(defaultValue)}"
      />
      <div class="dialog-actions">
        <button class="btn-secondary" data-action="cancel">${escapeHtml(cancelText)}</button>
        <button class="btn-primary" data-action="confirm">${escapeHtml(confirmText)}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const input = overlay.querySelector('.dialog-input') as HTMLInputElement;
  const cancelBtn = overlay.querySelector('[data-action="cancel"]') as HTMLButtonElement;
  const confirmBtn = overlay.querySelector('[data-action="confirm"]') as HTMLButtonElement;

  // Focus input after render
  setTimeout(() => input.focus(), 10);

  const closeDialog = () => {
    overlay.remove();
  };

  const handleConfirmClick = async () => {
    const value = input.value.trim();

    if (!value) {
      input.focus();
      input.classList.add('error');
      setTimeout(() => input.classList.remove('error'), 300);
      return;
    }

    confirmBtn.disabled = true;
    cancelBtn.disabled = true;
    confirmBtn.classList.add('loading');

    try {
      await onConfirm(value);
      closeDialog();
    } catch (error) {
      confirmBtn.disabled = false;
      cancelBtn.disabled = false;
      confirmBtn.classList.remove('loading');
    }
  };

  cancelBtn.addEventListener('click', () => {
    onCancel?.();
    closeDialog();
  });

  confirmBtn.addEventListener('click', handleConfirmClick);

  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleConfirmClick();
    }
  });

  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      onCancel?.();
      closeDialog();
    }
  });

  return closeDialog;
}
