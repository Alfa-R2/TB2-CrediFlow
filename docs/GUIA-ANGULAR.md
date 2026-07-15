# Guía rápida de Angular (aprende con este proyecto)

> **Para quién:** tu primera vez con Angular. Esta guía explica el framework usando el código
> real de **CrediFlow** que ya está en este repo. La idea es que leas un concepto y abras el
> archivo correspondiente para verlo funcionando.
>
> **Cómo usarla:** lee de arriba a abajo una vez. Luego, cuando toques una pantalla, vuelve a
> la sección que aplica. Cada sección termina con *"míralo en el código"*.

---

## 0. El modelo mental en 1 minuto

Angular es un framework para construir aplicaciones web de una sola página (SPA). Su idea central:

- La pantalla se arma con **componentes** (piezas reutilizables = HTML + lógica + estilos).
- Los componentes muestran **datos** y reaccionan a eventos del usuario.
- La lógica que se comparte (llamar al backend, guardar la sesión) vive en **servicios**.
- Angular **inyecta** esos servicios donde los necesites (no haces `new` a mano).
- Un **router** decide qué componente se ve según la URL.

En CrediFlow, además, hay una regla de oro: **el frontend no tiene lógica de negocio**. Solo pide
datos al backend y los muestra. Eso mantiene los componentes simples.

```
URL  →  Router  →  Componente  →  (pide datos a un)  Service  →  HttpClient  →  Backend
                        ↓
                    Plantilla (HTML) que muestra los datos
```

---

## 1. Cómo arranca la app

No hay `index.html` lleno de `<script>`. Angular arranca desde TypeScript:

1. [`src/main.ts`](../src/main.ts) llama a `bootstrapApplication(AppComponent, appConfig)`.
2. [`src/index.html`](../src/index.html) solo tiene `<app-root></app-root>`: ahí se "monta" la app.
3. [`app.config.ts`](../src/app/app.config.ts) registra los **providers** globales (router, HTTP, etc.).
4. [`app.component.ts`](../src/app/app.component.ts) es el componente raíz (la barra superior + el `<router-outlet>`).

**Standalone:** esta app usa componentes *standalone* (Angular 17+). Antes, Angular obligaba a
declarar todo dentro de "NgModules". Hoy cada componente declara sus propias dependencias en
`imports: [...]` y listo. Es más simple; no verás `*.module.ts` en este proyecto.

> *Míralo en el código:* abre `main.ts` → `app.config.ts` → `app.component.ts` en ese orden.

---

## 2. Un componente por dentro

Todo componente es una clase TypeScript con un decorador `@Component`. Ejemplo mínimo, el badge
de riesgo en [`shared/riesgo-badge.component.ts`](../src/app/shared/riesgo-badge.component.ts):

```ts
@Component({
  selector: 'app-riesgo-badge',                       // cómo se usa: <app-riesgo-badge>
  standalone: true,
  template: `<span class="badge" [class]="cssClass">{{ nivel }}</span>`,
})
export class RiesgoBadgeComponent {
  @Input({ required: true }) nivel!: NivelRiesgo;       // dato que entra desde fuera
  get cssClass(): string { /* color según el nivel */ }
}
```

Las tres partes de un `@Component`:

- **`selector`**: el nombre de la etiqueta HTML para usarlo (`<app-riesgo-badge>`).
- **`template`**: el HTML. Puede ir inline (entre backticks) o en un archivo `.html` aparte.
  En este proyecto van inline para tener todo a la vista.
- **`styles`**: CSS que aplica *solo* a este componente (aislado del resto). Lo ves p. ej. en
  [`login.component.ts`](../src/app/features/auth/login/login.component.ts).

### `@Input` = datos que entran

`@Input()` marca una propiedad que el componente padre le pasa al hijo:

```html
<app-riesgo-badge [nivel]="ev.nivelRiesgo" />
```

El `[nivel]="..."` (con corchetes) significa "evalúa esta expresión y pásala". Sin corchetes
(`nivel="BAJO"`) sería el texto literal `"BAJO"`.

> *Míralo en el código:* `riesgo-badge.component.ts` y dónde se usa en `evaluacion.component.ts`.

---

## 3. La plantilla: interpolación, binding y eventos

Dentro del `template` tienes una mini-sintaxis. Las 4 que más usarás:

| Sintaxis | Qué hace | Ejemplo en el repo |
|---|---|---|
| `{{ valor }}` | Muestra un valor (interpolación) | `{{ s.monto }}` |
| `[prop]="expr"` | Property binding: pasa un valor a un atributo/propiedad | `[disabled]="loading()"` |
| `(evento)="metodo()"` | Event binding: reacciona a un evento | `(click)="submit()"` |
| `[(ngModel)]="campo"` | Two-way binding: enlaza un input con una variable | filtros de auditoría |

Ejemplo real, el botón de login:

```html
<button class="btn btn-primary" type="submit" [disabled]="loading()">
  {{ loading() ? 'Ingresando…' : 'Ingresar' }}
</button>
```

- `[disabled]="loading()"` desactiva el botón mientras carga.
- `{{ loading() ? … : … }}` cambia el texto según el estado.

> *Míralo en el código:* [`login.component.ts`](../src/app/features/auth/login/login.component.ts).

---

## 4. Control de flujo en la plantilla (`@if`, `@for`)

Angular 17 trae una sintaxis nueva y más legible para condicionales y bucles. **Úsala** (la vieja
`*ngIf` / `*ngFor` aún existe, pero esta es la recomendada).

**Condicional `@if / @else`** — del listado de solicitudes:

```html
@if (loading()) {
  <div class="spinner">Cargando…</div>
} @else if (solicitudes().length === 0) {
  <div class="empty">No hay solicitudes.</div>
} @else {
  <table> … </table>
}
```

**Bucle `@for`** — siempre con `track` (Angular necesita saber cómo identificar cada ítem para
redibujar de forma eficiente; usa el `id`):

```html
@for (s of solicitudes(); track s.id) {
  <tr>
    <td>{{ s.id }}</td>
    <td>{{ s.monto | number: '1.2-2' }}</td>
  </tr>
}
```

⚠️ **Gotcha que ya nos pasó en este proyecto:** el alias `; as x` solo funciona en el `@if`
inicial, **no** en un `@else if`. Por eso en `solicitud-detalle.component.ts` verás un `@if`
anidado:

```html
@if (loading()) { … }
@else if (solicitud()) {
  @if (solicitud(); as s) {     ← aquí 's' queda disponible dentro del bloque
    {{ s.id }}
  }
}
```

> *Míralo en el código:* `solicitud-list.component.ts` (for) y `solicitud-detalle.component.ts` (if anidado).

---

## 5. Pipes: formatear sin ensuciar la lógica

Un **pipe** transforma un valor *solo para mostrarlo*, con la barra `|`:

```html
{{ s.monto | number: '1.2-2' }}            <!-- 1500 → 1,500.00 -->
{{ s.fechaRegistro | date: 'dd/MM/yyyy HH:mm' }}
{{ r.hashIntegridad | slice: 0 : 10 }}…    <!-- primeros 10 caracteres -->
```

Detalle importante en standalone: **hay que importar el pipe** en `imports: [...]` del componente.
Por eso al inicio de los archivos ves `import { DatePipe, DecimalPipe, SlicePipe } from '@angular/common'`
y luego `imports: [DatePipe, DecimalPipe, SlicePipe]`. Si olvidas importarlo, el build falla con
`No pipe found with name 'slice'` (nos pasó y se arregló agregando `SlicePipe`).

> *Míralo en el código:* `auditoria.component.ts`, `reportes.component.ts`.

---

## 6. Estado reactivo con *Signals*

Para guardar datos que cambian y que la pantalla refleje el cambio, este proyecto usa **signals**
(la forma moderna y recomendada en Angular 17+).

```ts
loading = signal(false);                       // crear
solicitudes = signal<SolicitudResponse[]>([]); // con tipo

this.loading.set(true);                         // escribir
this.solicitudes.set(list);                     // escribir
this.documentos.update(prev => [doc, ...prev]); // escribir a partir del valor previo

loading()          // LEER: se llama como función → en la plantilla: @if (loading())
```

Un **`computed`** es un signal derivado de otros; se recalcula solo cuando cambian sus fuentes.
Ejemplo: el menú visible según el rol, en [`app.component.ts`](../src/app/app.component.ts):

```ts
visibleMenu = computed(() => {
  const rol = this.auth.rol();
  return rol ? MENU.filter(item => item.roles.includes(rol)) : [];
});
```

> Regla práctica: **dato que cambia y se ve en pantalla → `signal`**. **Dato calculado de otros
> signals → `computed`**. En la plantilla siempre los lees con paréntesis: `loading()`.

> *Míralo en el código:* casi todos los componentes de `features/` usan signals para `loading` y datos.

---

## 7. Servicios e inyección de dependencias

La lógica que no es de UI (llamar al backend, guardar sesión) va en **servicios**: clases con
`@Injectable({ providedIn: 'root' })`. Ese `providedIn: 'root'` crea **una sola instancia**
compartida en toda la app (singleton).

Ejemplo, [`solicitud.service.ts`](../src/app/features/solicitudes/solicitud.service.ts):

```ts
@Injectable({ providedIn: 'root' })
export class SolicitudService {
  private http = inject(HttpClient);            // inyección con la función inject()
  private base = environment.apiBaseUrl;

  crear(body: CrearSolicitudRequest) {
    return this.http.post<SolicitudResponse>(`${this.base}/solicitudes`, body);
  }
  listar() { return this.http.get<SolicitudResponse[]>(`${this.base}/solicitudes`); }
}
```

Y un componente lo **inyecta** y lo usa:

```ts
export class SolicitudListComponent {
  private service = inject(SolicitudService);   // Angular te da la instancia ya creada
}
```

> **Inyección de dependencias (DI)** = no instancias servicios con `new`; los pides con
> `inject(X)` (o por constructor) y Angular te entrega la instancia. Esto facilita compartir
> estado (una sola sesión) y testear.

> *Míralo en el código:* cualquier `*.service.ts` en `features/` y cómo los `inject(...)` los componentes.

---

## 8. HttpClient y RxJS Observables

`HttpClient` no devuelve una promesa; devuelve un **Observable** de RxJS. Un Observable es un
"flujo" al que te **suscribes** para recibir el resultado:

```ts
this.service.listar().subscribe({
  next: (list) => this.solicitudes.set(list),   // llegó la respuesta
  error: () => this.loading.set(false),         // hubo error
});
```

Claves para empezar:

- La petición HTTP **no se dispara hasta que haces `.subscribe(...)`**.
- `next` recibe el dato; `error` se ejecuta si falla.
- Para casos sencillos, suscribirte y volcar el dato a un `signal` es suficiente (es lo que hace
  todo este proyecto). Más adelante aprenderás operadores (`map`, `tap`, `switchMap`, …).

En `auth.service.ts` verás `.pipe(tap(...))`: `pipe` encadena operadores; `tap` ejecuta un efecto
secundario (guardar el token) sin alterar el flujo.

> *Míralo en el código:* `auth.service.ts` (pipe + tap) y cualquier `.subscribe(...)` en los componentes.

---

## 9. Routing y lazy loading

Las rutas están en [`app.routes.ts`](../src/app/app.routes.ts): un array que mapea URL → componente.

```ts
{
  path: 'reglas',
  canActivate: [authGuard, roleGuard(['ADMIN_CREDITO'])],   // protección (ver §10)
  loadComponent: () => import('./features/reglas/reglas.component').then(m => m.ReglasComponent),
}
```

- **`loadComponent: () => import(...)`** = *lazy loading*: el código de esa pantalla se descarga
  **solo cuando navegas a ella**. Por eso el build genera un "chunk" por feature (lo viste en la
  salida de `ng build`). Mejora el tiempo de carga inicial.
- **`path: ':id'`** = parámetro de ruta. El componente lo lee con `ActivatedRoute`:
  ```ts
  this.id = Number(this.route.snapshot.paramMap.get('id'));
  ```
- **Navegar desde TypeScript:** `inject(Router).navigate(['/solicitudes', sol.id])`.
- **Navegar desde HTML:** `<a [routerLink]="['/solicitudes', s.id]">` y `routerLinkActive="active"`
  para resaltar el enlace activo (lo usa el menú superior).
- `<router-outlet />` en `app.component.ts` es el "hueco" donde el router pinta la pantalla actual.

> *Míralo en el código:* `app.routes.ts` (definición) y `app.component.ts` (`<router-outlet>` + menú).

---

## 10. Guards e interceptores (lo que hace "delgado y seguro" al cliente)

### Guards: protegen rutas

Un **guard** es una función que decide si puedes entrar a una ruta. Devuelve `true`, o un
`UrlTree` para redirigir.

- [`auth.guard.ts`](../src/app/core/auth/auth.guard.ts): si no hay sesión → redirige a `/login`.
- [`role.guard.ts`](../src/app/core/auth/role.guard.ts): si tu rol no está permitido → `/forbidden`.

Es una *fábrica*: `roleGuard(['ADMIN_CREDITO'])` devuelve un guard configurado con esos roles.

### Interceptores: tocan TODAS las peticiones HTTP

Un **interceptor** se mete en medio de cada request/response. Se registran una vez en
`app.config.ts`: `provideHttpClient(withInterceptors([authInterceptor, errorInterceptor]))`.

- [`auth.interceptor.ts`](../src/app/core/auth/auth.interceptor.ts): añade el header
  `Authorization: Bearer <token>` a cada llamada. Así no repites eso en cada servicio.
- [`error.interceptor.ts`](../src/app/core/http/error.interceptor.ts): captura errores del backend
  y reacciona de forma central (401 → logout, 403 → /forbidden, 400/409 → muestra el mensaje…).

> Esta combinación (guards + interceptores) es lo que permite que cada pantalla sea simple: la
> seguridad y el manejo de errores están centralizados, no copiados en cada componente.

> *Míralo en el código:* `core/auth/*.ts` y `core/http/error.interceptor.ts`, registrados en `app.config.ts`.

---

## 11. Formularios reactivos

Para formularios, este proyecto usa **Reactive Forms** (definidos en TypeScript, con validación).
Ejemplo del login:

```ts
form = this.fb.nonNullable.group({
  username: ['', Validators.required],
  password: ['', Validators.required],
});
```

En el HTML lo conectas con `[formGroup]` y `formControlName`:

```html
<form [formGroup]="form" (ngSubmit)="submit()">
  <input formControlName="username" [class.invalid]="invalid('username')" />
</form>
```

- `Validators.required`, `Validators.min(0)`… validan en el cliente (UX). **La validación de
  negocio real la hace el backend** y responde 400; el interceptor muestra ese mensaje.
- `form.invalid`, `control.touched`, `form.getRawValue()` son las piezas que usas para mostrar
  errores y enviar los datos.
- Para grupos anidados (cliente dentro de solicitud) se usa `formGroupName="cliente"`: ve
  [`solicitud-form.component.ts`](../src/app/features/solicitudes/solicitud-form.component.ts).

Existe también `FormsModule` con `[(ngModel)]` para casos simples (filtros): lo ves en
`auditoria.component.ts` y `solicitud-list.component.ts`.

> *Míralo en el código:* `login.component.ts`, `solicitud-form.component.ts`, `reglas.component.ts`.

---

## 12. Estilos

- [`src/styles.css`](../src/styles.css): estilos **globales** y variables de color (`--primary: #1c7ed6`,
  el azul de los mockups). Clases reutilizables: `.card`, `.btn`, `.table`, `.badge`, `.form-grid`.
- `styles: [...]` dentro de un `@Component`: CSS **local** a ese componente, aislado del resto
  (Angular lo "encapsula" automáticamente). Útil para layouts específicos de una pantalla.

> *Míralo en el código:* `styles.css` (global) vs. el bloque `styles:` en `evaluacion.component.ts` (local).

---

## 13. Comandos del día a día

```bash
npm start            # ng serve con proxy → http://localhost:4200 (recarga al guardar)
npm run build        # build de producción → dist/
npx ng generate component features/x/mi-comp --standalone   # andamiar un componente
npx ng generate service features/x/mi-serv                  # andamiar un servicio
```

`ng serve` levanta un servidor de desarrollo con *hot reload*: guardas un archivo y el navegador
se actualiza solo. Si el build falla, el error sale en la terminal **y** en el navegador.

---

## 14. Errores típicos de principiante (y cómo se ven)

| Síntoma | Causa | Solución |
|---|---|---|
| `No pipe found with name 'date'` | Olvidaste importar el pipe | Añade `DatePipe` a `imports: [...]` |
| `Property 'x' does not exist` en la plantilla | Usaste un alias `as x` en un `@else if` | Anida un `@if (...; as x)` dentro |
| `'app-foo' is not a known element` | No importaste el componente hijo | Añádelo a `imports: [...]` del padre |
| La petición HTTP "no hace nada" | No te suscribiste | Falta `.subscribe(...)` |
| `NullInjectorError: No provider for X` | Servicio sin `providedIn: 'root'` o sin proveer | Marca `@Injectable({ providedIn: 'root' })` |
| El valor no cambia en pantalla | Leíste el signal sin `()` | Usa `loading()`, no `loading` |
| Petición responde con error 500 al mandar datos inválidos | El backend lanzó una excepción no controlada en el Service (ej. `IllegalArgumentException`). | Cambia la excepción en Java a `BadRequestException` para que el `GlobalExceptionHandler` la traduzca automáticamente en un HTTP 400. |
| Petición responde con error 409 al registrar una solicitud | El cliente ya posee un flujo activo en evaluación (`REGISTRADA`). | Es el comportamiento correcto diseñado en el **CP09** del backend; la UI debe capturar el error vía `errorInterceptor` y renderizar el aviso. |

---

## 15. Ruta de aprendizaje sugerida (orden para leer este repo)

1. `main.ts` → `app.config.ts` → `app.component.ts` (cómo arranca y se arma el shell).
2. `core/models/` (los tipos: enums y DTOs — el "contrato" con el backend).
3. `features/auth/login/login.component.ts` + `core/auth/auth.service.ts` (formulario + servicio + signals).
4. `app.routes.ts` + `core/auth/*.guard.ts` (routing y protección por rol).
5. `core/auth/auth.interceptor.ts` + `core/http/error.interceptor.ts` (lo transversal).
6. `features/solicitudes/` completo (lista + form + detalle: el CRUD típico de punta a punta).
7. El resto de features siguen el mismo patrón; ya los entenderás de un vistazo.

### Para profundizar (documentación oficial)

- Tutorial oficial interactivo: <https://angular.dev/tutorials/learn-angular>
- Signals: <https://angular.dev/guide/signals>
- Componentes y plantillas: <https://angular.dev/guide/components>
- Routing: <https://angular.dev/guide/routing>
- HttpClient: <https://angular.dev/guide/http>

> Cuando dudes de "¿cómo se hace X en Angular?", busca `angular.dev` + el concepto. La doc nueva
> (angular.dev) ya está toda en estilo standalone + signals, igual que este proyecto.
