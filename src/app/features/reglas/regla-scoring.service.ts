import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ReglaScoringRequest, ReglaScoringResponse } from '../../core/models/dtos';

@Injectable({ providedIn: 'root' })
export class ReglaScoringService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  listar(): Observable<ReglaScoringResponse[]> {
    return this.http.get<ReglaScoringResponse[]>(`${this.base}/reglas`);
  }

  crear(b: ReglaScoringRequest): Observable<ReglaScoringResponse> {
    return this.http.post<ReglaScoringResponse>(`${this.base}/reglas`, b);
  }

  actualizar(id: number, b: ReglaScoringRequest): Observable<ReglaScoringResponse> {
    return this.http.put<ReglaScoringResponse>(`${this.base}/reglas/${id}`, b);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/reglas/${id}`);
  }
}
