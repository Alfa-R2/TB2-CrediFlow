import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CrearSolicitudRequest,
  SolicitudResponse,
  EstadoResponse,
  DecisionRequest,
} from '../../core/models/dtos';
import { EstadoSolicitud } from '../../core/models/enums';

@Injectable({ providedIn: 'root' })
export class SolicitudService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  crear(body: CrearSolicitudRequest): Observable<SolicitudResponse> {
    return this.http.post<SolicitudResponse>(`${this.base}/solicitudes`, body);
  }

  listar(filtro?: { estado?: EstadoSolicitud; clienteId?: number }): Observable<SolicitudResponse[]> {
    let params = new HttpParams();
    if (filtro?.estado) params = params.set('estado', filtro.estado);
    if (filtro?.clienteId != null) params = params.set('clienteId', filtro.clienteId);
    return this.http.get<SolicitudResponse[]>(`${this.base}/solicitudes`, { params });
  }

  obtener(id: number): Observable<SolicitudResponse> {
    return this.http.get<SolicitudResponse>(`${this.base}/solicitudes/${id}`);
  }

  estado(id: number): Observable<EstadoResponse> {
    return this.http.get<EstadoResponse>(`${this.base}/solicitudes/${id}/estado`);
  }

  decidir(id: number, body: DecisionRequest): Observable<EstadoResponse> {
    return this.http.post<EstadoResponse>(`${this.base}/solicitudes/${id}/decision`, body);
  }
}
