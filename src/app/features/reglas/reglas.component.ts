import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ReglaScoringService } from './regla-scoring.service';
import { NotificationService } from '../../core/notifications/notification.service';
import { ReglaScoringRequest, ReglaScoringResponse } from '../../core/models/dtos';
import { OperadorRegla } from '../../core/models/enums';

@Component({
  selector: 'app-reglas',
  standalone: true,
  imports: [DecimalPipe, ReactiveFormsModule],
  template: `
    <div class="card">
      <h1 class="card-title">Reglas de scoring</h1>
      <p class="card-sub">Administración de reglas de evaluación (HU07 · ADMIN_CREDITO)</p>

      <!-- Formulario crear / editar -->
      <form [formGroup]="form" (ngSubmit)="guardar()">
        <h2 class="section-title">{{ editId() ? 'Editar regla #' + editId() : 'Nueva regla' }}</h2>
        <div class="form-grid">
          <div class="field">
            <label for="nombre">Nombre</label>
            <input id="nombre" type="text" formControlName="nombre" [class.invalid]="invalid('nombre')" />
          </div>
          <div class="field">
            <label for="parametro">Parámetro</label>
            <input id="parametro" type="text" formControlName="parametro" placeholder="ej. ratioEndeudamiento"
              [class.invalid]="invalid('parametro')" />
          </div>
          <div class="field">
            <label for="operador">Operador</label>
            <select id="operador" formControlName="operador">
              <option value="GT">GT (mayor que)</option>
              <option value="LT">LT (menor que)</option>
              <option value="EQ">EQ (igual a)</option>
            </select>
          </div>
          <div class="field">
            <label for="umbral">Umbral</label>
            <input id="umbral" type="number" step="0.01" formControlName="umbral" [class.invalid]="invalid('umbral')" />
          </div>
          <div class="field">
            <label for="ponderacion">Ponderación</label>
            <input id="ponderacion" type="number" step="0.01" formControlName="ponderacion"
              [class.invalid]="invalid('ponderacion')" />
          </div>
          <div class="field" style="justify-content:flex-end">
            <label class="check">
              <input type="checkbox" formControlName="activa" /> Activa
            </label>
          </div>
        </div>
        <div class="actions">
          @if (editId()) {
            <button class="btn btn-ghost" type="button" (click)="cancelarEdicion()">Cancelar</button>
          }
          <button class="btn btn-primary" type="submit" [disabled]="saving()">
            {{ editId() ? 'Actualizar' : 'Crear regla' }}
          </button>
        </div>
      </form>

      <!-- Listado -->
      <h2 class="section-title">Reglas registradas</h2>
      @if (loading()) {
        <div class="spinner">Cargando…</div>
      } @else if (reglas().length === 0) {
        <div class="empty">No hay reglas registradas.</div>
      } @else {
        <table class="table">
          <thead>
            <tr>
              <th>#</th><th>Nombre</th><th>Parámetro</th><th>Operador</th>
              <th>Umbral</th><th>Ponderación</th><th>Activa</th><th></th>
            </tr>
          </thead>
          <tbody>
            @for (r of reglas(); track r.id) {
              <tr>
                <td>{{ r.id }}</td>
                <td>{{ r.nombre }}</td>
                <td>{{ r.parametro }}</td>
                <td>{{ r.operador }}</td>
                <td>{{ r.umbral | number: '1.0-2' }}</td>
                <td>{{ r.ponderacion | number: '1.0-2' }}</td>
                <td>
                  <span class="badge" [class]="r.activa ? 'badge-green' : 'badge-gray'">
                    {{ r.activa ? 'Sí' : 'No' }}
                  </span>
                </td>
                <td style="white-space:nowrap">
                  <button class="btn btn-ghost btn-sm" type="button" (click)="editar(r)">Editar</button>
                  <button class="btn btn-danger-outline btn-sm" type="button" (click)="eliminar(r)">Eliminar</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
  styles: [
    `
      .check {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 500;
      }
      .check input {
        width: auto;
      }
    `,
  ],
})
export class ReglasComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(ReglaScoringService);
  private notify = inject(NotificationService);

  loading = signal(false);
  saving = signal(false);
  editId = signal<number | null>(null);
  reglas = signal<ReglaScoringResponse[]>([]);

  form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    parametro: ['', Validators.required],
    operador: ['GT' as OperadorRegla, Validators.required],
    umbral: [null as number | null, Validators.required],
    ponderacion: [null as number | null, Validators.required],
    activa: [true],
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.service.listar().subscribe({
      next: (list) => {
        this.reglas.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  invalid(control: string): boolean {
    const c = this.form.get(control);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const body = this.form.getRawValue() as ReglaScoringRequest;
    const id = this.editId();
    const op$ = id ? this.service.actualizar(id, body) : this.service.crear(body);
    op$.subscribe({
      next: () => {
        this.saving.set(false);
        this.notify.success(id ? 'Regla actualizada.' : 'Regla creada.');
        this.cancelarEdicion();
        this.cargar();
      },
      error: () => this.saving.set(false),
    });
  }

  editar(r: ReglaScoringResponse): void {
    this.editId.set(r.id);
    this.form.setValue({
      nombre: r.nombre,
      parametro: r.parametro,
      operador: r.operador,
      umbral: r.umbral,
      ponderacion: r.ponderacion,
      activa: r.activa,
    });
  }

  cancelarEdicion(): void {
    this.editId.set(null);
    this.form.reset({ operador: 'GT', activa: true });
  }

  eliminar(r: ReglaScoringResponse): void {
    if (!confirm(`¿Eliminar la regla "${r.nombre}"?`)) return;
    this.service.eliminar(r.id).subscribe({
      next: () => {
        this.notify.success('Regla eliminada.');
        this.cargar();
      },
    });
  }
}
