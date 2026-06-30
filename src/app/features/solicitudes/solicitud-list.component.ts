import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SolicitudService } from './solicitud.service';
import { SolicitudResponse } from '../../core/models/dtos';
import { EstadoSolicitud } from '../../core/models/enums';
import { EstadoBadgeComponent } from '../../shared/estado-badge.component';

@Component({
  selector: 'app-solicitud-list',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule, RouterLink, EstadoBadgeComponent],
  template: `
    <div class="card">
      <div class="row-between" style="margin-bottom:16px">
        <div>
          <h1 class="card-title">Solicitudes</h1>
          <p class="card-sub" style="margin:0">Listado de solicitudes de crédito (HU02/HU04)</p>
        </div>
        <button class="btn btn-primary" type="button" (click)="nueva()">+ Nueva solicitud</button>
      </div>

      <div class="row-between" style="margin-bottom:16px">
        <div class="field" style="max-width:220px">
          <label for="filtroEstado">Filtrar por estado</label>
          <select id="filtroEstado" [(ngModel)]="estadoFiltro" (ngModelChange)="cargar()">
            <option [ngValue]="undefined">Todos</option>
            @for (e of estados; track e) {
              <option [ngValue]="e">{{ e }}</option>
            }
          </select>
        </div>
      </div>

      @if (loading()) {
        <div class="spinner">Cargando…</div>
      } @else if (solicitudes().length === 0) {
        <div class="empty">No hay solicitudes para mostrar.</div>
      } @else {
        <table class="table">
          <thead>
            <tr>
              <th>N°</th>
              <th>Cliente ID</th>
              <th>Monto (S/)</th>
              <th>Plazo</th>
              <th>Estado</th>
              <th>Fecha registro</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (s of solicitudes(); track s.id) {
              <tr>
                <td>{{ s.id }}</td>
                <td>{{ s.clienteId }}</td>
                <td>{{ s.monto | number: '1.2-2' }}</td>
                <td>{{ s.plazoMeses }} m</td>
                <td><app-estado-badge [estado]="s.estado" /></td>
                <td>{{ s.fechaRegistro | date: 'dd/MM/yyyy HH:mm' }}</td>
                <td><a [routerLink]="['/solicitudes', s.id]">Ver detalle</a></td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
})
export class SolicitudListComponent implements OnInit {
  private service = inject(SolicitudService);
  private router = inject(Router);

  loading = signal(false);
  solicitudes = signal<SolicitudResponse[]>([]);
  estados: EstadoSolicitud[] = ['REGISTRADA', 'EVALUADA', 'APROBADA', 'RECHAZADA'];
  estadoFiltro: EstadoSolicitud | undefined = undefined;

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.service.listar(this.estadoFiltro ? { estado: this.estadoFiltro } : undefined).subscribe({
      next: (list) => {
        this.solicitudes.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  nueva(): void {
    this.router.navigate(['/solicitudes/nueva']);
  }
}
