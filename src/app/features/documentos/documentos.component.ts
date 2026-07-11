import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DocumentoService } from './documento.service';
import { NotificationService } from '../../core/notifications/notification.service';
import { DocumentoResponse } from '../../core/models/dtos';
import { TipoDocumento } from '../../core/models/enums';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB (validación de UX; el backend revalida)

@Component({
  selector: 'app-documentos',
  standalone: true,
  imports: [DatePipe, SlicePipe, FormsModule, RouterLink],
  template: `
    <div class="card">
      <a [routerLink]="['/solicitudes', solicitudId]">← Volver a la solicitud</a>
      <h1 class="card-title" style="margin-top:16px">Documentos de la solicitud</h1>
      <p class="card-sub">Solicitud N° {{ solicitudId }} · PDF o JPG · máximo 5 MB por archivo (HU03)</p>

      <div class="upload-box">
        <div class="form-grid">
          <div class="field">
            <label for="tipo">Tipo de documento</label>
            <select id="tipo" [(ngModel)]="tipo">
              <option value="BOLETA_PAGO">Boleta de pago</option>
              <option value="ESTADO_FINANCIERO">Estado financiero</option>
            </select>
          </div>
          <div class="field">
            <label for="archivo">Archivo</label>
            <input id="archivo" type="file" accept=".pdf,.jpg,.jpeg,application/pdf,image/jpeg"
              (change)="onFile($event)" />
          </div>
        </div>
        @if (archivo()) {
          <p class="muted">Seleccionado: {{ archivo()!.name }} ({{ tamanioKb() }} KB)</p>
        }
        <div class="actions" style="margin-top:12px">
          <button class="btn btn-primary" type="button" (click)="subir()" [disabled]="!archivo() || loading()">
            {{ loading() ? 'Subiendo…' : 'Subir' }}
          </button>
        </div>
      </div>

      <h2 class="section-title">Documentos cargados</h2>
      @if (documentos().length === 0) {
        <div class="empty">Aún no se han cargado documentos en esta sesión.</div>
      } @else {
        <table class="table">
          <thead>
            <tr><th>Tipo</th><th>Archivo</th><th>Hash</th><th>Fecha</th><th>Estado</th></tr>
          </thead>
          <tbody>
            @for (d of documentos(); track d.id) {
              <tr>
                <td>{{ d.tipo === 'BOLETA_PAGO' ? 'Boleta de pago' : 'Estado financiero' }}</td>
                <td>{{ nombreArchivo(d.urlArchivo) }}</td>
                <td>{{ d.hash | slice: 0 : 10 }}…</td>
                <td>{{ d.fechaCarga | date: 'dd/MM/yyyy HH:mm' }}</td>
                <td><span class="badge badge-green">✔ Validado</span></td>
              </tr>
            }
          </tbody>
        </table>
      }
      <p class="muted" style="margin-top:16px">
        Cada documento se asocia a la solicitud y el backend calcula su hash de integridad.
      </p>
    </div>
  `,
  styles: [
    `
      .upload-box {
        border: 1px dashed var(--placeholder);
        background: var(--surface-alt);
        border-radius: 8px;
        padding: 20px;
        margin: 16px 0;
      }
    `,
  ],
})
export class DocumentosComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private service = inject(DocumentoService);
  private notify = inject(NotificationService);

  solicitudId!: number;
  tipo: TipoDocumento = 'BOLETA_PAGO';
  archivo = signal<File | null>(null);
  documentos = signal<DocumentoResponse[]>([]);
  loading = signal(false);

  ngOnInit(): void {
    this.solicitudId = Number(this.route.snapshot.paramMap.get('id'));
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file && file.size > MAX_BYTES) {
      this.notify.error('El archivo supera el tamaño máximo permitido (5 MB).');
      input.value = '';
      this.archivo.set(null);
      return;
    }
    this.archivo.set(file);
  }

  tamanioKb(): number {
    return Math.round((this.archivo()?.size ?? 0) / 1024);
  }

  subir(): void {
    const file = this.archivo();
    if (!file) return;
    this.loading.set(true);
    this.service.subir(this.solicitudId, this.tipo, file).subscribe({
      next: (doc) => {
        this.loading.set(false);
        this.documentos.update((list) => [doc, ...list]);
        this.archivo.set(null);
        this.notify.success('Documento cargado correctamente.');
      },
      error: () => this.loading.set(false),
    });
  }

  nombreArchivo(url: string): string {
    return url?.split(/[\\/]/).pop() ?? url;
  }
}
