import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EvaluacionResponse } from '../../core/models/dtos';

@Injectable({ providedIn: 'root' })
export class EvaluacionService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  /** Ejecuta la evaluación de riesgo (la lógica vive en el backend). POST -> 200 */
  evaluar(solicitudId: number): Observable<EvaluacionResponse> {
    return this.http.post<EvaluacionResponse>(
      `${this.base}/solicitudes/${solicitudId}/evaluacion`,
      {},
    );
  }

  /** Consulta la evaluación ya calculada. */
  ver(solicitudId: number): Observable<EvaluacionResponse> {
    return this.http.get<EvaluacionResponse>(
      `${this.base}/solicitudes/${solicitudId}/evaluacion`,
    );
  }
}
