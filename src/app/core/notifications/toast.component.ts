import { Component, inject } from '@angular/core';
import { NotificationService } from './notification.service';

@Component({
  selector: 'app-toast-host',
  standalone: true,
  template: `
    <div class="toast-host">
      @for (t of notifications.toasts(); track t.id) {
        <div class="toast toast-{{ t.type }}">
          <span>{{ t.message }}</span>
          <button type="button" (click)="notifications.dismiss(t.id)" aria-label="Cerrar">×</button>
        </div>
      }
    </div>
  `,
})
export class ToastHostComponent {
  notifications = inject(NotificationService);
}
