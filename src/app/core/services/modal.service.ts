import { Injectable, signal } from '@angular/core';

export interface ModalConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'info' | 'success';
  onConfirm: () => void;
  onCancel?: () => void;
}

@Injectable({ providedIn: 'root' })
export class ModalService {
  isOpen = signal(false);
  config = signal<ModalConfig | null>(null);

  confirm(config: ModalConfig) {
    this.config.set({
      ...config,
      confirmText: config.confirmText || 'Confirm',
      cancelText: config.cancelText || 'Cancel',
      type: config.type || 'info'
    });
    this.isOpen.set(true);
  }

  alert(title: string, message: string, type: 'info' | 'danger' | 'success' = 'info') {
    this.config.set({
      title,
      message,
      confirmText: 'OK',
      type,
      onConfirm: () => {}
    });
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
    setTimeout(() => this.config.set(null), 300); // Wait for animation
  }

  handleConfirm() {
    this.config()?.onConfirm();
    this.close();
  }

  handleCancel() {
    this.config()?.onCancel?.();
    this.close();
  }
}
