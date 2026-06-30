import { Injectable, inject, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, TokenResponse } from '../models/dtos';
import { RolNombre } from '../models/enums';
import { Session, landingForRole } from './session.model';

const STORAGE_KEY = 'crediflow.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private base = environment.apiBaseUrl;

  /** Sesión actual como signal (reactiva para el shell/menú). */
  private _session = signal<Session | null>(this.restore());
  readonly session = this._session.asReadonly();
  readonly isAuthenticated = computed(() => this._session() !== null);
  readonly rol = computed<RolNombre | null>(() => this._session()?.rol ?? null);
  readonly username = computed<string | null>(() => this._session()?.username ?? null);

  /** Token plano para el interceptor (acceso sincrónico). */
  get token(): string | null {
    return this._session()?.token ?? null;
  }

  login(body: LoginRequest): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.base}/auth/login`, body).pipe(
      tap((res) => {
        const session: Session = {
          token: res.token,
          rol: res.rol,
          username: this.decodeUsername(res.token) ?? body.username,
        };
        this.persist(session);
        this._session.set(session);
      }),
    );
  }

  /** Logout: borra sesión y redirige a /login. */
  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    this._session.set(null);
    this.router.navigate(['/login']);
  }

  /** Ruta de aterrizaje según el rol de la sesión. */
  landing(): string {
    const rol = this.rol();
    return rol ? landingForRole(rol) : '/login';
  }

  hasRole(roles: RolNombre[]): boolean {
    const rol = this.rol();
    return rol !== null && roles.includes(rol);
  }

  // ---------- persistencia ----------
  private persist(session: Session): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  private restore(): Session | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Session;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  /** Decodifica el claim `sub` del JWT solo para mostrar el username (opcional, §6.1). */
  private decodeUsername(token: string): string | null {
    try {
      const payload = token.split('.')[1];
      const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      return json.sub ?? null;
    } catch {
      return null;
    }
  }
}
