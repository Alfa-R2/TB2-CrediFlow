import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditoriaService } from './auditoria.service';
import { RegistroAuditoriaResponse } from '../../core/models/dtos';

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [DatePipe, SlicePipe, FormsModule],
  template: `
    <div class="card">
      <div class="row-between">
        <div>
          <h1 class="card-title">Historial de auditoría</h1>
          <p class="card-sub" style="margin:0">Consulta del registro inmutable (HU09–HU11)</p>
        </div>
        <span class="badge badge-orange">🔒 Registro inmutable</span>
      </div>

      <!-- Filtros -->
      <div class="filtros">
        <div class="field">
          <label for="cliente">Cliente ID</label>
          <input id="cliente" type="number" [(ngModel)]="clienteId" placeholder="Buscar por cliente" />
        </div>
        <div class="field">
          <label for="desde">Desde</label>
          <input id="desde" type="date" [(ngModel)]="desde" />
        </div>
        <div class="field">
          <label for="hasta">Hasta</label>
          <input id="hasta" type="date" [(ngModel)]="hasta" />
        </div>
        <button class="btn btn-primary" type="button" (click)="buscar()">Buscar</button>
      </div>

      @if (loading()) {
        <div class="spinner">Cargando…</div>
      } @else if (registros().length === 0) {
        <div class="empty">No hay registros para los filtros aplicados.</div>
      } @else {
        <table class="table">
          <thead>
            <tr>
              <th>Fecha y hora</th><th>Solicitud</th><th>Acción</th>
              <th>Usuario</th><th>Hash integridad</th><th>Hash previo</th>
            </tr>
          </thead>
          <tbody>
            @for (r of registros(); track r.id) {
              <tr>
                <td>{{ r.fecha | date: 'dd/MM/yyyy HH:mm' }}</td>
                <td>{{ r.solicitudId }}</td>
                <td>
                  <span class="badge" [class]="r.accion === 'APROBADA' ? 'badge-green' : 'badge-red'">
                    {{ r.accion }}
                  </span>
                </td>
                <td>{{ r.usuario }}</td>
                <td><code>{{ r.hashIntegridad | slice: 0 : 10 }}…</code></td>
                <td><code>{{ r.hashPrevio | slice: 0 : 10 }}…</code></td>
              </tr>
            }
          </tbody>
        </table>
      }
      <p class="muted" style="margin-top:16px">
        Los registros son de solo lectura (append-only) y están sellados con hash de integridad.
      </p>
    </div>
  `,
  styles: [
    `
      .filtros {
        display: flex;
        gap: 16px;
        align-items: flex-end;
        flex-wrap: wrap;
        margin: 20px 0;
      }
      .filtros .field {
        max-width: 200px;
      }
      code {
        font-size: 12px;
      }
    `,
  ],
})
export class AuditoriaComponent implements OnInit {
  private service = inject(AuditoriaService);

  loading = signal(false);
  registros = signal<RegistroAuditoriaResponse[]>([]);
  clienteId: number | null = null;
  desde = '';
  hasta = '';

  ngOnInit(): void {
    this.buscar();
  }

  buscar(): void {
    this.loading.set(true);
    this.service
      .consultar({
        clienteId: this.clienteId ?? undefined,
        desde: this.desde || undefined,
        hasta: this.hasta || undefined,
      })
      .subscribe({
        next: (list) => {
          this.registros.set(list);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}
