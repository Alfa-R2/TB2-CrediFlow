import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { RolNombre } from '../models/enums';

/**
 * roleGuard(roles): permite si la sesión tiene un rol ∈ roles; si no → /forbidden (§6.3).
 * Si no hay sesión, redirige a /login.
 */
export function roleGuard(roles: RolNombre[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.isAuthenticated()) return router.createUrlTree(['/login']);
    if (auth.hasRole(roles)) return true;
    return router.createUrlTree(['/forbidden']);
  };
}
