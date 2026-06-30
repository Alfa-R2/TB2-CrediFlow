import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DocumentoResponse } from '../../core/models/dtos';
import { TipoDocumento } from '../../core/models/enums';

@Injectable({ providedIn: 'root' })
export class DocumentoService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  /**
   * Carga multipart: 'tipo' va como query param, 'archivo' como parte de FormData (§7).
   * POST /solicitudes/{id}/documentos?tipo={tipo}  -> 201
   */
  subir(id: number, tipo: TipoDocumento, archivo: File): Observable<DocumentoResponse> {
    const fd = new FormData();
    fd.append('archivo', archivo);
    return this.http.post<DocumentoResponse>(
      `${this.base}/solicitudes/${id}/documentos`,
      fd,
      { params: { tipo } },
    );
  }
}
