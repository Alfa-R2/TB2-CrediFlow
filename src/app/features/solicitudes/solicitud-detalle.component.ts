import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SolicitudService } from './solicitud.service';
import { SolicitudResponse } from '../../core/models/dtos';
import { EstadoBadgeComponent } from '../../shared/estado-badge.component';

@Component({
  selector: 'app-solicitud-detalle',
  standalone: true,
  imports: [DatePipe, DecimalPipe, RouterLink, EstadoBadgeComponent],
  template: `
    <div class="card">
      <a routerLink="/solicitudes">← Volver al listado</a>

      @if (loading()) {
        <div class="spinner">Cargando…</div>
      } @else if (solicitud()) {
        @if (solicitud(); as s) {
        <div class="row-between" style="margin:16px 0">
          <h1 class="card-title">Solicitud N° {{ s.id }}</h1>
          <app-estado-badge [estado]="s.estado" />
        </div>

        <table class="table">
          <tbody>
            <tr><td><strong>Cliente ID</strong></td><td>{{ s.clienteId }}</td></tr>
            <tr><td><strong>Asesor ID</strong></td><td>{{ s.asesorId }}</td></tr>
            <tr><td><strong>Monto</strong></td><td>S/ {{ s.monto | number: '1.2-2' }}</td></tr>
            <tr><td><strong>Plazo</strong></td><td>{{ s.plazoMeses }} meses</td></tr>
            <tr><td><strong>Estado (en vivo)</strong></td><td>{{ estadoVivo() ?? s.estado }}</td></tr>
            <tr><td><strong>Fecha de registro</strong></td><td>{{ s.fechaRegistro | date: 'dd/MM/yyyy HH:mm' }}</td></tr>
          </tbody>
        </table>

        <div class="actions">
          <button class="btn btn-ghost" type="button" (click)="refrescarEstado()">
            Refrescar estado
          </button>
          <a class="btn btn-primary" [routerLink]="['/solicitudes', s.id, 'documentos']">
            Cargar documentos
          </a>
        </div>
        }
      } @else {
        <div class="empty">Solicitud no encontrada.</div>
      }
    </div>
  `,
})
export class SolicitudDetalleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private service = inject(SolicitudService);

  loading = signal(false);
  solicitud = signal<SolicitudResponse | null>(null);
  estadoVivo = signal<string | null>(null);
  private id!: number;

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.loading.set(true);
    this.service.obtener(this.id).subscribe({
      next: (s) => {
        this.solicitud.set(s);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  refrescarEstado(): void {
    this.service.estado(this.id).subscribe({
      next: (e) => this.estadoVivo.set(e.estado),
    });
  }
}
