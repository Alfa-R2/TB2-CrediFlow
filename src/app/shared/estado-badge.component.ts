import { Component, Input } from '@angular/core';
import { EstadoSolicitud } from '../core/models/enums';

/** Badge de estado de solicitud con su color. */
@Component({
  selector: 'app-estado-badge',
  standalone: true,
  template: `<span class="badge" [class]="cssClass">{{ estado }}</span>`,
})
export class EstadoBadgeComponent {
  @Input({ required: true }) estado!: EstadoSolicitud;

  get cssClass(): string {
    switch (this.estado) {
      case 'APROBADA':
        return 'badge-green';
      case 'RECHAZADA':
        return 'badge-red';
      case 'EVALUADA':
        return 'badge-orange';
      case 'REGISTRADA':
        return 'badge-blue';
      default:
        return 'badge-gray';
    }
  }
}
