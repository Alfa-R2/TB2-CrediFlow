import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

/** Punto de entrada de evaluación: pedir el N° de solicitud y navegar al detalle. */
@Component({
  selector: 'app-evaluacion-buscar',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="card">
      <h1 class="card-title">Evaluación de riesgo</h1>
      <p class="card-sub">Ingresa el N° de solicitud para evaluar o ver su resultado (HU05/06/08)</p>

      <div class="form-grid">
        <div class="field">
          <label for="id">N° de solicitud</label>
          <input id="id" type="number" [(ngModel)]="id" placeholder="Ej. 123"
            (keyup.enter)="ir()" />
        </div>
      </div>
      <div class="actions">
        <button class="btn btn-primary" type="button" (click)="ir()" [disabled]="!id">
          Abrir evaluación
        </button>
      </div>
    </div>
  `,
})
export class EvaluacionBuscarComponent {
  private router = inject(Router);
  id: number | null = null;

  ir(): void {
    if (this.id) this.router.navigate(['/evaluacion', this.id]);
  }
}
