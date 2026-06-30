import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
import { MENU } from './core/auth/session.model';
import { ToastHostComponent } from './core/notifications/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastHostComponent],
  template: `
    <div class="app-shell">
      @if (auth.isAuthenticated()) {
        <header class="topbar">
          <span class="brand">CrediFlow</span>
          <nav>
            @for (item of visibleMenu(); track item.path) {
              <a [routerLink]="item.path" routerLinkActive="active">{{ item.label }}</a>
            }
          </nav>
          <div class="user">
            @if (auth.username()) {
              <span>{{ auth.username() }}</span>
            }
            <span class="role-chip">{{ auth.rol() }}</span>
            <button class="btn-logout" type="button" (click)="auth.logout()">Salir</button>
          </div>
        </header>
      }

      <main class="content">
        <router-outlet />
      </main>
    </div>

    <app-toast-host />
  `,
})
export class AppComponent {
  auth = inject(AuthService);

  /** Menú filtrado por el rol de la sesión (§6.4: "construir el menú con solo las rutas del rol"). */
  visibleMenu = computed(() => {
    const rol = this.auth.rol();
    if (!rol) return [];
    return MENU.filter((item) => item.roles.includes(rol));
  });
}
