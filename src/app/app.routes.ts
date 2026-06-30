import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';

/**
 * Routing con lazy loading por feature y guards por rol (§4, §6.3, §8).
 * Cada ruta protegida exige sesión (authGuard) y rol (roleGuard).
 */
export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },

  // --- Solicitudes (ASESOR) ---
  {
    path: 'solicitudes',
    canActivate: [authGuard, roleGuard(['ASESOR'])],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/solicitudes/solicitud-list.component').then(
            (m) => m.SolicitudListComponent,
          ),
      },
      {
        path: 'nueva',
        loadComponent: () =>
          import('./features/solicitudes/solicitud-form.component').then(
            (m) => m.SolicitudFormComponent,
          ),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./features/solicitudes/solicitud-detalle.component').then(
            (m) => m.SolicitudDetalleComponent,
          ),
      },
      {
        path: ':id/documentos',
        loadComponent: () =>
          import('./features/documentos/documentos.component').then(
            (m) => m.DocumentosComponent,
          ),
      },
    ],
  },

  // --- Evaluación (ANALISTA ejecuta/ve · COMITE ve y decide) ---
  {
    path: 'evaluacion',
    canActivate: [authGuard, roleGuard(['ANALISTA', 'COMITE'])],
    loadComponent: () =>
      import('./features/evaluacion/evaluacion-buscar.component').then(
        (m) => m.EvaluacionBuscarComponent,
      ),
  },
  {
    path: 'evaluacion/:id',
    canActivate: [authGuard, roleGuard(['ANALISTA', 'COMITE'])],
    loadComponent: () =>
      import('./features/evaluacion/evaluacion.component').then((m) => m.EvaluacionComponent),
  },

  // --- Reglas de scoring (ADMIN_CREDITO) ---
  {
    path: 'reglas',
    canActivate: [authGuard, roleGuard(['ADMIN_CREDITO'])],
    loadComponent: () =>
      import('./features/reglas/reglas.component').then((m) => m.ReglasComponent),
  },

  // --- Auditoría (AUDITOR, CUMPLIMIENTO) ---
  {
    path: 'auditoria',
    canActivate: [authGuard, roleGuard(['AUDITOR', 'CUMPLIMIENTO'])],
    loadComponent: () =>
      import('./features/auditoria/auditoria.component').then((m) => m.AuditoriaComponent),
  },

  // --- Reportes (GERENTE) ---
  {
    path: 'reportes',
    canActivate: [authGuard, roleGuard(['GERENTE'])],
    loadComponent: () =>
      import('./features/reportes/reportes.component').then((m) => m.ReportesComponent),
  },

  {
    path: 'forbidden',
    loadComponent: () =>
      import('./shared/forbidden.component').then((m) => m.ForbiddenComponent),
  },

  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' },
];
