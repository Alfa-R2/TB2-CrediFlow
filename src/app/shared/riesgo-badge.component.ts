import { Component, Input } from '@angular/core';
import { NivelRiesgo } from '../core/models/enums';

/** Badge de nivel de riesgo BAJO/MEDIO/ALTO con su color (refleja lo que devuelve el backend). */
@Component({
  selector: 'app-riesgo-badge',
  standalone: true,
  template: `<span class="badge" [class]="cssClass">{{ nivel }}</span>`,
})
export class RiesgoBadgeComponent {
  @Input({ required: true }) nivel!: NivelRiesgo;

  get cssClass(): string {
    switch (this.nivel) {
      case 'BAJO':
        return 'badge-green';
      case 'MEDIO':
        return 'badge-orange';
      case 'ALTO':
        return 'badge-red';
      default:
        return 'badge-gray';
    }
  }
}
