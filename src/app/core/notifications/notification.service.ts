import { Injectable, signal } from '@angular/core';

export type ToastType = 'error' | 'success' | 'info' | 'warn';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private seq = 0;
  readonly toasts = signal<Toast[]>([]);

  show(message: string, type: ToastType = 'error', timeoutMs = 5000): void {
    const id = ++this.seq;
    this.toasts.update((list) => [...list, { id, type, message }]);
    if (timeoutMs > 0) {
      setTimeout(() => this.dismiss(id), timeoutMs);
    }
  }

  success(message: string): void {
    this.show(message, 'success', 4000);
  }
  error(message: string): void {
    this.show(message, 'error', 6000);
  }
  warn(message: string): void {
    this.show(message, 'warn', 6000);
  }
  info(message: string): void {
    this.show(message, 'info', 4000);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
