import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { NotificationService } from '../notifications/notification.service';
import { ApiError } from '../models/dtos';

/**
 * Mapea el ApiError del backend a feedback de UI (§9):
 *  400 → mensaje de validación · 401 → logout · 403 → /forbidden
 *  404 → recurso no encontrado · 409 → aviso no bloqueante · 5xx → error genérico
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notify = inject(NotificationService);

  return next(req).pipe(
    catchError((e: HttpErrorResponse) => {
      const apiError = e.error as ApiError | undefined;
      const backendMsg = apiError?.message;

      switch (e.status) {
        case 0:
          notify.error('No se pudo conectar con el servidor. ¿Está corriendo el backend?');
          break;
        case 400:
          notify.error(backendMsg ?? 'Datos inválidos. Revisa el formulario.');
          break;
        case 401:
          auth.logout();
          notify.warn('Sesión expirada o inválida. Inicia sesión nuevamente.');
          break;
        case 403:
          router.navigate(['/forbidden']);
          break;
        case 404:
          notify.error(backendMsg ?? 'Recurso no encontrado.');
          break;
        case 409:
          // Aviso no bloqueante (p. ej. transición de estado inválida).
          notify.warn(backendMsg ?? 'Operación no permitida en el estado actual.');
          break;
        case 413:
          notify.error('El archivo supera el tamaño máximo permitido (5 MB).');
          break;
        default:
          if (e.status >= 500) {
            notify.error('Error del servidor, intenta más tarde.');
          } else {
            notify.error(backendMsg ?? 'Error inesperado.');
          }
      }
      return throwError(() => e);
    }),
  );
};
