import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  template: `
    <div class="card" style="text-align:center">
      <h1 class="card-title">403 · Sin permiso</h1>
      <p class="card-sub">No tienes permiso para acceder a esta acción o pantalla.</p>
      <button class="btn btn-primary" type="button" (click)="volver()">Ir a mi inicio</button>
    </div>
  `,
})
export class ForbiddenComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  volver(): void {
    this.router.navigateByUrl(this.auth.isAuthenticated() ? this.auth.landing() : '/login');
  }
}
