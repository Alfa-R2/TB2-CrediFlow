import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="login-wrap">
      <div class="login-card card">
        <div class="login-icon">🔒</div>
        <h1 class="card-title" style="text-align:center">Bienvenido</h1>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="field">
            <label for="username">Usuario</label>
            <input
              id="username"
              type="text"
              formControlName="username"
              placeholder="usuario"
              autocomplete="username"
              [class.invalid]="invalid('username')"
            />
            @if (invalid('username')) {
              <span class="field-error">El usuario es obligatorio.</span>
            }
          </div>

          <div class="field">
            <label for="password">Contraseña</label>
            <input
              id="password"
              type="password"
              formControlName="password"
              placeholder="••••••••"
              autocomplete="current-password"
              [class.invalid]="invalid('password')"
            />
            @if (invalid('password')) {
              <span class="field-error">La contraseña es obligatoria.</span>
            }
          </div>

          <button class="btn btn-primary login-btn" type="submit" [disabled]="loading()">
            {{ loading() ? 'Ingresando…' : 'Ingresar' }}
          </button>
        </form>

        <p class="muted" style="text-align:center;margin-top:18px">
          Acceso restringido por rol · token JWT
        </p>
      </div>
    </div>
  `,
  styles: [
    `
      .login-wrap {
        display: flex;
        justify-content: center;
        padding-top: 32px;
      }
      .login-card {
        width: 340px;
      }
      .login-icon {
        text-align: center;
        font-size: 28px;
        margin-bottom: 8px;
      }
      .field {
        margin-bottom: 16px;
      }
      .login-btn {
        width: 100%;
        margin-top: 8px;
      }
    `,
  ],
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);

  form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  ngOnInit(): void {
    // Si ya hay sesión, ir directo al inicio del rol.
    if (this.auth.isAuthenticated()) {
      this.router.navigateByUrl(this.auth.landing());
    }
  }

  invalid(control: 'username' | 'password'): boolean {
    const c = this.form.controls[control];
    return c.invalid && (c.touched || c.dirty);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);
        // Tras el login redirige a la primera pantalla disponible para el rol.
        this.router.navigateByUrl(this.auth.landing());
      },
      error: () => {
        // El errorInterceptor ya mostró el mensaje (401 = credenciales inválidas).
        this.loading.set(false);
      },
    });
  }
}
