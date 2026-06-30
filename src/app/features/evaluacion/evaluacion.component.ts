import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EvaluacionService } from './evaluacion.service';
import { SolicitudService } from '../solicitudes/solicitud.service';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationService } from '../../core/notifications/notification.service';
import { EvaluacionResponse } from '../../core/models/dtos';
import { AccionDecision } from '../../core/models/enums';
import { RiesgoBadgeComponent } from '../../shared/riesgo-badge.component';

/**
 * Pantalla de evaluación de riesgo (HU05/06/08).
 * - ANALISTA: ejecuta la evaluación (POST) y la ve.
 * - COMITE: ve el resultado y decide (aprobar/rechazar).
 * Todo el cálculo (score, capacidad, riesgo, justificación) viene del backend; el cliente solo lo muestra.
 */
@Component({
  selector: 'app-evaluacion',
  standalone: true,
  imports: [DecimalPipe, RouterLink, RiesgoBadgeComponent],
  template: `
    <div class="card">
      <a routerLink="/evaluacion">← Buscar otra solicitud</a>
      <h1 class="card-title" style="margin-top:16px">Evaluación de riesgo</h1>
      <p class="card-sub">Solicitud N° {{ solicitudId }}</p>

      @if (loading()) {
        <div class="spinner">Cargando…</div>
      } @else if (evaluacion()) {
        @if (evaluacion(); as ev) {
        <div class="eval-grid">
          <div>
            <p class="muted">Capacidad de pago</p>
            <p class="big">S/ {{ ev.capacidadPago | number: '1.2-2' }} <span class="muted">/ mes</span></p>

            <p class="muted" style="margin-top:20px">Score crediticio</p>
            <div class="score-bar">
              <div class="score-fill" [style.width.%]="ev.score"></div>
            </div>
            <p class="big" style="font-size:18px">{{ ev.score }} / 100</p>
          </div>
          <div class="riesgo-box">
            <p class="muted">Nivel de riesgo</p>
            <app-riesgo-badge [nivel]="ev.nivelRiesgo" />
          </div>
        </div>

        <div class="justif">
          <p style="font-weight:700;margin:0 0 8px">Reglas aplicadas (justificación)</p>
          <pre>{{ ev.justificacion }}</pre>
        </div>

        @if (esComite()) {
          <div class="actions">
            <button class="btn btn-danger-outline" type="button"
              [disabled]="deciding()" (click)="decidir('RECHAZAR')">Rechazar</button>
            <button class="btn btn-success" type="button"
              [disabled]="deciding()" (click)="decidir('APROBAR')">Aprobar</button>
          </div>
          <p class="muted" style="text-align:right">Decisión del comité de crédito (HU08)</p>
        }
        }
      } @else {
        <div class="empty">
          <p>No hay evaluación registrada para esta solicitud.</p>
          @if (esAnalista()) {
            <button class="btn btn-primary" type="button" [disabled]="evaluando()" (click)="evaluar()">
              {{ evaluando() ? 'Evaluando…' : 'Ejecutar evaluación' }}
            </button>
          } @else {
            <p class="muted">Aún no fue evaluada por un analista.</p>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .eval-grid {
        display: grid;
        grid-template-columns: 1fr 220px;
        gap: 24px;
        margin: 20px 0;
      }
      .big { font-size: 24px; font-weight: 700; margin: 4px 0; }
      .score-bar {
        height: 18px;
        border-radius: 9px;
        background: #e9ecef;
        overflow: hidden;
        max-width: 360px;
      }
      .score-fill { height: 100%; background: var(--orange); }
      .riesgo-box {
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 16px;
        text-align: center;
        display: flex;
        flex-direction: column;
        gap: 12px;
        align-items: center;
        justify-content: center;
      }
      .justif {
        background: #f8f9fa;
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 16px;
        margin-top: 8px;
      }
      .justif pre {
        margin: 0;
        white-space: pre-wrap;
        font-family: inherit;
        font-size: 13px;
      }
      @media (max-width: 720px) {
        .eval-grid { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class EvaluacionComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private service = inject(EvaluacionService);
  private solicitudService = inject(SolicitudService);
  private auth = inject(AuthService);
  private notify = inject(NotificationService);

  solicitudId!: number;
  loading = signal(false);
  evaluando = signal(false);
  deciding = signal(false);
  evaluacion = signal<EvaluacionResponse | null>(null);

  esComite = computed(() => this.auth.hasRole(['COMITE']));
  esAnalista = computed(() => this.auth.hasRole(['ANALISTA']));

  ngOnInit(): void {
    this.solicitudId = Number(this.route.snapshot.paramMap.get('id'));
    this.cargar();
  }

  private cargar(): void {
    this.loading.set(true);
    this.service.ver(this.solicitudId).subscribe({
      next: (ev) => {
        this.evaluacion.set(ev);
        this.loading.set(false);
      },
      error: () => {
        // 404 = aún no evaluada; el interceptor avisa pero dejamos la UI lista para evaluar.
        this.evaluacion.set(null);
        this.loading.set(false);
      },
    });
  }

  evaluar(): void {
    this.evaluando.set(true);
    this.service.evaluar(this.solicitudId).subscribe({
      next: (ev) => {
        this.evaluacion.set(ev);
        this.evaluando.set(false);
        this.notify.success('Evaluación ejecutada.');
      },
      error: () => this.evaluando.set(false),
    });
  }

  decidir(accion: AccionDecision): void {
    this.deciding.set(true);
    this.solicitudService.decidir(this.solicitudId, { accion }).subscribe({
      next: (res) => {
        this.deciding.set(false);
        this.notify.success(`Solicitud ${res.estado}.`);
      },
      error: () => this.deciding.set(false),
    });
  }
}
