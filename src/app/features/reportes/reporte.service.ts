import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ReporteIndicadores } from '../../core/models/dtos';

@Injectable({ providedIn: 'root' })
export class ReporteService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  indicadores(): Observable<ReporteIndicadores> {
    return this.http.get<ReporteIndicadores>(`${this.base}/reportes/indicadores`);
  }
}
