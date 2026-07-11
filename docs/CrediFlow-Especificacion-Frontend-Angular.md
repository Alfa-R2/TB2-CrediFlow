# CrediFlow — Especificación técnica del Frontend (Angular, cliente delgado)

> **Para quién:** otra sesión de Claude (u otro desarrollador) que construirá el cliente
> Angular, y el desarrollador a cargo que verifica que se construya correctamente.
>
> **Premisa de arquitectura (decisión confirmada):** Angular es un **cliente delgado**.
> **No contiene lógica de negocio.** Toda regla (máquina de estados, capacidad de pago,
> scoring, sellado de auditoría) vive y se valida en el **backend Spring Boot ya construido**.
> El frontend solo: autentica, muestra pantallas, envía/recibe JSON y refleja el estado.
>
> **Backend de referencia (ya implementado):** `TB-CreditFlow` · Spring Boot 4.1 ·
> base URL **`http://localhost:8080/api`**.

---

## 1. Alcance

Construir un SPA que consuma la API REST existente y cubra las pantallas de los mockups,
con autenticación JWT y navegación por rol. **Sin** lógica de negocio en el cliente.

| Incluye | No incluye |
|---|---|
| Login JWT, guardado de token, interceptor, guards por rol | Reglas de scoring/estados en el cliente (las hace el backend) |
| 6–7 pantallas mapeadas a HU | SSR / micro-frontends |
| Consumo de los 15 endpoints REST | Pruebas automatizadas de UI (las pruebas del frontend son **manuales**, ver §11) |
| Manejo de errores `ApiError` | Gestión de usuarios (no hay endpoint de alta de usuarios) |

---

## 2. Stack y versiones

| Aspecto | Decisión |
|---|---|
| Framework | **Angular 17+** (componentes **standalone**, sin NgModules) |
| Lenguaje | TypeScript 5.x (strict) |
| HTTP | `HttpClient` + interceptores funcionales (`provideHttpClient(withInterceptors(...))`) |
| Routing | Angular Router con **lazy loading** por feature y `canActivate` guards |
| Estado | Servicios + RxJS (`BehaviorSubject` para sesión). **No** se requiere NgRx |
| Estilos | Libre (CSS plano o Angular Material). Los mockups usan azul `#1c7ed6` como color primario |
| Build | Angular CLI (`ng build`, `ng serve`) |

> El frontend va en **repositorio aparte** del backend (así está declarado en el README).

---

## 3. Configuración de entorno

`src/environments/environment.ts`
```ts
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8080/api',
};
```

**CORS:** el backend ya permite el origen `http://localhost:4200` (configurable por
`CORS_ALLOWED_ORIGINS`), métodos `GET,POST,PUT,DELETE,OPTIONS`, todos los headers y
credenciales. En desarrollo, alternativamente, usar un **proxy** para evitar CORS:

`proxy.conf.json`
```json
{ "/api": { "target": "http://localhost:8080", "secure": false } }
```
y `ng serve --proxy-config proxy.conf.json` (con `apiBaseUrl: '/api'`).

---

## 4. Estructura de carpetas

```
src/app/
├── core/
│   ├── auth/
│   │   ├── auth.service.ts          # login, logout, token, rol actual
│   │   ├── auth.interceptor.ts      # agrega Authorization: Bearer
│   │   ├── auth.guard.ts            # exige sesión
│   │   ├── role.guard.ts            # exige rol(es)
│   │   └── session.model.ts
│   ├── http/
│   │   └── error.interceptor.ts     # mapea ApiError, 401→logout
│   └── models/                      # interfaces de DTOs + enums (§5)
├── features/
│   ├── auth/login/                  # HU12
│   ├── solicitudes/                 # HU01, HU02, HU04 (listar, crear, detalle, estado)
│   ├── documentos/                  # HU03 (carga)
│   ├── evaluacion/                  # HU05, HU06, HU08 (evaluar, ver, decisión)
│   ├── reglas/                      # HU07 (CRUD de reglas) — rol ADMIN_CREDITO
│   ├── auditoria/                   # HU09–HU11 (historial)
│   └── reportes/                    # HU13 (tablero de indicadores)
├── shared/                          # componentes UI reutilizables (tabla, badge de riesgo…)
├── app.routes.ts
└── app.config.ts
```

---

## 5. Modelo de tipos (TypeScript) — espejo de los DTOs del backend

> Mantener nombres de campos **idénticos** a los del JSON del backend.

### 5.1 Enums

```ts
export type RolNombre =
  | 'ASESOR' | 'ANALISTA' | 'ADMIN_CREDITO' | 'COMITE'
  | 'CUMPLIMIENTO' | 'AUDITOR' | 'GERENTE';

export type EstadoSolicitud = 'REGISTRADA' | 'EVALUADA' | 'APROBADA' | 'RECHAZADA';
export type NivelRiesgo     = 'BAJO' | 'MEDIO' | 'ALTO';
export type TipoDoc         = 'DNI' | 'CE' | 'RUC';
export type TipoDocumento   = 'BOLETA_PAGO' | 'ESTADO_FINANCIERO';
export type AccionDecision  = 'APROBAR' | 'RECHAZAR';
export type AccionAuditoria = 'APROBADA' | 'RECHAZADA';
export type OperadorRegla   = 'GT' | 'LT' | 'EQ';
export type EstadoUsuario   = 'ACTIVO' | 'INACTIVO';
```

### 5.2 Interfaces (request / response)

```ts
// --- Auth ---
export interface LoginRequest  { username: string; password: string; }
export interface TokenResponse { token: string; rol: RolNombre; }

// --- Solicitud ---
export interface ClienteRequest {
  tipoDoc: TipoDoc; numDoc: string; nombres: string; apellidos: string;
  ingresoMensual: number; deudasActuales: number;   // BigDecimal -> number
}
export interface CrearSolicitudRequest {
  cliente: ClienteRequest; monto: number; plazoMeses: number;
}
export interface SolicitudResponse {
  id: number; clienteId: number; asesorId: number;
  monto: number; plazoMeses: number;
  estado: EstadoSolicitud; fechaRegistro: string;   // ISO LocalDateTime
}
export interface EstadoResponse { estado: EstadoSolicitud; }

// --- Documento ---
export interface DocumentoResponse {
  id: number; solicitudId: number; tipo: TipoDocumento;
  urlArchivo: string; hash: string; fechaCarga: string;
}

// --- Evaluación ---
export interface EvaluacionResponse {
  id: number; solicitudId: number; capacidadPago: number; score: number;
  nivelRiesgo: NivelRiesgo; justificacion: string; fecha: string;
}
export interface DecisionRequest { accion: AccionDecision; }

// --- Reglas de scoring ---
export interface ReglaScoringRequest {
  nombre: string; parametro: string; operador: OperadorRegla;
  umbral: number; ponderacion: number; activa: boolean;
}
export interface ReglaScoringResponse extends ReglaScoringRequest { id: number; }

// --- Auditoría ---
export interface RegistroAuditoriaResponse {
  id: number; solicitudId: number; accion: AccionAuditoria;
  usuario: string; fecha: string; hashIntegridad: string; hashPrevio: string;
}

// --- Reportes ---
export interface ReporteIndicadores {
  totalSolicitudes: number; aprobadas: number; rechazadas: number;
  porcentajeAprobacion: number; tiempoPromedioDias: number;
  distribucionRiesgo: Record<string, number>;   // "BAJO"|"MEDIO"|"ALTO" -> conteo
}

// --- Error estándar del backend ---
export interface ApiError {
  timestamp: string; status: number; error: string; message: string; path: string;
}
```

---

## 6. Autenticación y autorización

### 6.1 Flujo
1. `POST /api/auth/login` con `{username, password}` → `{token, rol}`.
2. Guardar `token` y `rol` (p. ej. `localStorage` + `BehaviorSubject` de sesión).
3. Todas las llamadas siguientes envían `Authorization: Bearer <token>`.
4. **Logout** = borrar token/rol y redirigir a `/login`.

> El JWT trae `sub` (username) y claim `rol`; expira a las **24 h**. No es necesario
> decodificarlo en el cliente (el `rol` ya viene en la respuesta de login), pero si se
> quiere mostrar el username, puede decodificarse el payload.

### 6.2 Interceptor de auth (funcional)
```ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token;
  return token
    ? next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }))
    : next(req);
};
```

### 6.3 Guards
- `authGuard`: bloquea rutas si no hay token → redirige a `/login`.
- `roleGuard(roles: RolNombre[])`: permite si `sesion.rol ∈ roles`, si no → `/forbidden`.

### 6.4 Mapa rol → pantallas accesibles

| Rol | Pantallas / rutas | HU |
|---|---|---|
| `ASESOR` | Solicitudes (listar/crear/detalle/estado), Carga de documentos | HU01–HU04 |
| `ANALISTA` | Evaluación (ejecutar y ver) | HU05, HU06 |
| `COMITE` | Evaluación (ver) + Decisión (aprobar/rechazar) | HU08 |
| `ADMIN_CREDITO` | Reglas de scoring (CRUD) | HU07 |
| `AUDITOR`, `CUMPLIMIENTO` | Historial de auditoría | HU09–HU11 |
| `GERENTE` | Tablero de indicadores | HU13 |

> Tras el login, construir el menú con solo las rutas del `rol` recibido.

---

## 7. Servicios HTTP por módulo

Cada servicio usa `environment.apiBaseUrl`. Firmas sugeridas:

```ts
// AuthService
login(body: LoginRequest): Observable<TokenResponse>            // POST /auth/login

// SolicitudService
crear(body: CrearSolicitudRequest): Observable<SolicitudResponse>          // POST   /solicitudes        -> 201
listar(filtro?: { estado?: EstadoSolicitud; clienteId?: number }):
      Observable<SolicitudResponse[]>                                      // GET    /solicitudes
obtener(id: number): Observable<SolicitudResponse>                         // GET    /solicitudes/{id}
estado(id: number): Observable<EstadoResponse>                             // GET    /solicitudes/{id}/estado
decidir(id: number, body: DecisionRequest): Observable<EstadoResponse>     // POST   /solicitudes/{id}/decision

// DocumentoService  (multipart: 'tipo' va como query param, 'archivo' como parte de FormData; máx 5 MB)
subir(id: number, tipo: TipoDocumento, archivo: File): Observable<DocumentoResponse>
//   POST /solicitudes/{id}/documentos?tipo={tipo}   body: FormData con 'archivo'   -> 201

// EvaluacionService
evaluar(solicitudId: number): Observable<EvaluacionResponse>   // POST /solicitudes/{solicitudId}/evaluacion -> 200
ver(solicitudId: number): Observable<EvaluacionResponse>       // GET  /solicitudes/{solicitudId}/evaluacion

// ReglaScoringService
listar(): Observable<ReglaScoringResponse[]>                   // GET    /reglas
crear(b: ReglaScoringRequest): Observable<ReglaScoringResponse>// POST   /reglas         -> 201
actualizar(id: number, b: ReglaScoringRequest): Observable<ReglaScoringResponse> // PUT /reglas/{id}
eliminar(id: number): Observable<void>                         // DELETE /reglas/{id}    -> 204

// AuditoriaService
consultar(f?: { clienteId?: number; desde?: string; hasta?: string }):
      Observable<RegistroAuditoriaResponse[]>                  // GET /auditoria  (desde/hasta = yyyy-MM-dd)

// ReporteService
indicadores(): Observable<ReporteIndicadores>                  // GET /reportes/indicadores
```

**Ejemplo de carga multipart:**
```ts
subir(id: number, tipo: TipoDocumento, archivo: File) {
  const fd = new FormData();
  fd.append('archivo', archivo);
  return this.http.post<DocumentoResponse>(
    `${base}/solicitudes/${id}/documentos`, fd, { params: { tipo } });
}
```

---

## 8. Pantallas ↔ HU ↔ endpoints (desde los mockups)

| # | Pantalla (mockup) | Ruta | Rol | Endpoints que consume |
|---|---|---|---|---|
| 01 | Login | `/login` | público | `POST /auth/login` |
| 02 | Registro de solicitud | `/solicitudes/nueva` | ASESOR | `POST /solicitudes` |
| 03 | Carga de documentos | `/solicitudes/:id/documentos` | ASESOR | `POST /solicitudes/{id}/documentos` |
| 04 | Evaluación de riesgo | `/solicitudes/:id/evaluacion` | ANALISTA, COMITE | `POST/GET …/evaluacion`, `POST …/decision` (COMITE) |
| 05 | Historial de auditoría | `/auditoria` | AUDITOR, CUMPLIMIENTO | `GET /auditoria` |
| 06 | Tablero de indicadores | `/reportes` | GERENTE | `GET /reportes/indicadores` |
| (07) | Reglas de scoring (admin) | `/reglas` | ADMIN_CREDITO | CRUD `/reglas` |
| — | Listado de solicitudes | `/solicitudes` | ASESOR | `GET /solicitudes`, `GET /solicitudes/{id}/estado` |

> La pantalla 04 muestra `capacidadPago`, `score`, `nivelRiesgo` (badge BAJO/MEDIO/ALTO con
> color) y la `justificacion` (texto de reglas aplicadas) **tal como los devuelve el backend**.
> El botón Aprobar/Rechazar (rol COMITE) llama a `…/decision` con `{accion: 'APROBAR'|'RECHAZAR'}`.

---

## 9. Manejo de errores (interceptor)

El backend responde con `ApiError` (`timestamp, status, error, message, path`). El frontend:

| Status | Acción en UI |
|---|---|
| 400 | Mostrar `message` (errores de validación) junto al formulario |
| 401 | Token inválido/ausente → **logout** y redirigir a `/login` |
| 403 | Redirigir a `/forbidden` ("no tienes permiso para esta acción") |
| 404 | Mensaje "recurso no encontrado" |
| 409 | Mostrar `message` (p. ej. transición de estado inválida) como aviso no bloqueante |
| 5xx | Mensaje genérico "error del servidor, intenta más tarde" |

```ts
export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(catchError((e: HttpErrorResponse) => {
    if (e.status === 401) inject(AuthService).logout();
    inject(NotificationService).show(e.error?.message ?? 'Error inesperado');
    return throwError(() => e);
  }));
```

---

## 10. Plan de construcción por fases

| Fase | Entregable | Verificación |
|---|---|---|
| **F0** | Proyecto Angular, routing base, `environment`, interceptores, AuthService | `ng serve` levanta; `/login` carga |
| **F1** | Login + sesión + guards + menú por rol | Login con `admin/admin` redirige y muestra menú de ADMIN_CREDITO |
| **F2** | Solicitudes (crear/listar/detalle/estado) — ASESOR | Crear solicitud devuelve 201 y aparece en el listado |
| **F3** | Documentos (carga multipart) — ASESOR | Subir archivo ≤5 MB devuelve 201 |
| **F4** | Evaluación + Decisión — ANALISTA/COMITE | Evaluar muestra score/nivel; decidir cambia estado |
| **F5** | Auditoría + Reportes + Reglas | Historial lista registros; tablero pinta indicadores; CRUD de reglas |

> Orden alineado con el flujo del negocio. Cada fase consume solo endpoints ya existentes.

---

## 11. Pruebas (manuales) y criterios de aceptación

Por decisión de alcance, las pruebas del **frontend son manuales** (checklist), alineadas a
las HU. No hay gate de cobertura para el frontend.

| Pantalla | Caso manual | Resultado esperado |
|---|---|---|
| Login | Credenciales válidas / inválidas | Acceso y menú por rol / mensaje 401 |
| Solicitud | Crear con `monto`/`plazoMeses` ≤ 0 o `ingresoMensual` vacío | El backend responde 400 y se muestra el mensaje |
| Solicitud | Intentar registrar una nueva solicitud para un cliente que ya tiene un proceso activo | El backend responde 409 y se muestra el mensaje |
| Documentos | Subir archivo > 5 MB | Mensaje de error (413/400) |
| Evaluación | Evaluar y luego decidir; reintentar decisión sobre solicitud ya decidida | Estado cambia; segunda decisión muestra 409 |
| Auditoría | Filtrar por `clienteId`, `desde`, `hasta` | Lista filtrada |
| Indicadores | Cargar tablero | Totales y distribución de riesgo coinciden con backend |
| Roles | Entrar a una ruta no permitida para el rol | Redirige a `/forbidden` (refleja el 403 del backend) |

---

## 12. Definition of Done (frontend)

- Todas las rutas protegidas por `authGuard` + `roleGuard` según §6.4.
- Cada servicio usa los **endpoints y payloads exactos** de §5–§7 (nombres de campos idénticos).
- **Cero lógica de negocio** en el cliente: el cliente no calcula score, ni valida reglas, ni
  decide transiciones; solo muestra lo que devuelve el backend.
- Manejo de errores `ApiError` implementado (§9), con 401 → logout.
- Checklist manual de §11 ejecutado y registrado como evidencia.
- `ng build` sin errores; `ng serve` integra contra el backend en `http://localhost:8080/api`.

---

## 13. Comandos

```bash
ng new crediflow-web --standalone --routing --style=css
ng serve --proxy-config proxy.conf.json     # dev contra backend en :8080
ng build                                    # build de producción
```

> **Requisito previo:** el backend debe estar corriendo (`mvn spring-boot:run`) con la BD
> PostgreSQL levantada; usuario inicial `admin / admin` (rol `ADMIN_CREDITO`).
