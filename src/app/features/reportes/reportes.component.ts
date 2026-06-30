import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ReporteService } from './reporte.service';
import { ReporteIndicadores } from '../../core/models/dtos';

interface BarraRiesgo {
  nivel: string;
  conteo: number;
  porcentaje: number;
  color: string;
}

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="card">
      <h1 class="card-title">Indicadores del proceso de crédito</h1>
      <p class="card-sub">Tablero de indicadores (HU13 · GERENTE)</p>

      @if (loading()) {
        <div class="spinner">Cargando…</div>
      } @else if (data()) {
        @if (data(); as d) {
        <div class="kpi-grid">
          <div class="kpi">
            <div class="kpi-label">Total solicitudes</div>
            <div class="kpi-value" style="color:var(--primary)">{{ d.totalSolicitudes }}</div>
          </div>
          <div class="kpi">
            <div class="kpi-label">Aprobadas</div>
            <div class="kpi-value">{{ d.aprobadas }}</div>
          </div>
          <div class="kpi">
            <div class="kpi-label">Rechazadas</div>
            <div class="kpi-value" style="color:var(--red)">{{ d.rechazadas }}</div>
          </div>
          <div class="kpi">
            <div class="kpi-label">% aprobación</div>
            <div class="kpi-value" style="color:var(--green)">
              {{ d.porcentajeAprobacion | number: '1.0-1' }}%
            </div>
          </div>
        </div>

        <div class="kpi" style="margin-top:16px;max-width:260px">
          <div class="kpi-label">Tiempo promedio</div>
          <div class="kpi-value">{{ d.tiempoPromedioDias | number: '1.0-1' }} d</div>
        </div>

        <h2 class="section-title">Distribución por nivel de riesgo</h2>
        @if (barras().length === 0) {
          <p class="muted">Sin datos de distribución.</p>
        } @else {
          <div class="dist">
            @for (b of barras(); track b.nivel) {
              <div class="dist-row">
                <span class="dist-leg">
                  <span class="dot" [style.background]="b.color"></span>{{ b.nivel }}
                </span>
                <span class="bar-track">
                  <span class="bar-fill" [style.width.%]="b.porcentaje" [style.background]="b.color"></span>
                </span>
                <span class="dist-val">{{ b.conteo }} ({{ b.porcentaje | number: '1.0-0' }}%)</span>
              </div>
            }
          </div>
        }
        }
      } @else {
        <div class="empty">No se pudieron cargar los indicadores.</div>
      }
    </div>
  `,
  styles: [
    `
      .dist {
        display: flex;
        flex-direction: column;
        gap: 14px;
        margin-top: 8px;
        max-width: 520px;
      }
      .dist-row {
        display: grid;
        grid-template-columns: 90px 1fr 110px;
        align-items: center;
        gap: 12px;
      }
      .dist-leg {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .dot {
        width: 14px;
        height: 14px;
        border-radius: 3px;
        display: inline-block;
      }
      .bar-track {
        background: #e9ecef;
        border-radius: 5px;
        height: 10px;
        overflow: hidden;
      }
      .bar-fill {
        display: block;
        height: 100%;
      }
      .dist-val {
        font-size: 13px;
        text-align: right;
      }
    `,
  ],
})
export class ReportesComponent implements OnInit {
  private service = inject(ReporteService);

  loading = signal(false);
  data = signal<ReporteIndicadores | null>(null);

  private colores: Record<string, string> = {
    BAJO: 'var(--green)',
    MEDIO: 'var(--orange)',
    ALTO: 'var(--red)',
  };

  /** Convierte el mapa distribucionRiesgo en barras con porcentaje (solo presentación). */
  barras = computed<BarraRiesgo[]>(() => {
    const d = this.data();
    if (!d?.distribucionRiesgo) return [];
    const entradas = Object.entries(d.distribucionRiesgo);
    const total = entradas.reduce((acc, [, n]) => acc + n, 0) || 1;
    const orden = ['BAJO', 'MEDIO', 'ALTO'];
    return entradas
      .sort((a, b) => orden.indexOf(a[0]) - orden.indexOf(b[0]))
      .map(([nivel, conteo]) => ({
        nivel,
        conteo,
        porcentaje: (conteo / total) * 100,
        color: this.colores[nivel] ?? 'var(--text-muted)',
      }));
  });

  ngOnInit(): void {
    this.loading.set(true);
    this.service.indicadores().subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
