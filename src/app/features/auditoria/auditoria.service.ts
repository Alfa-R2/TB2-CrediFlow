import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RegistroAuditoriaResponse } from '../../core/models/dtos';

@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  /** GET /auditoria — desde/hasta en formato yyyy-MM-dd (§7). */
  consultar(f?: {
    clienteId?: number;
    desde?: string;
    hasta?: string;
  }): Observable<RegistroAuditoriaResponse[]> {
    let params = new HttpParams();
    if (f?.clienteId != null) params = params.set('clienteId', f.clienteId);
    if (f?.desde) params = params.set('desde', f.desde);
    if (f?.hasta) params = params.set('hasta', f.hasta);
    return this.http.get<RegistroAuditoriaResponse[]>(`${this.base}/auditoria`, { params });
  }
}
