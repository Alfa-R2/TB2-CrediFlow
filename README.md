# CrediFlow — Frontend Angular (cliente delgado)

SPA en **Angular 18 (standalone)** que consume la API REST de **TB-CreditFlow** (Spring Boot,
`http://localhost:8080/api`). Es un **cliente delgado**: no contiene lógica de negocio; solo
autentica, muestra pantallas, envía/recibe JSON y refleja el estado que devuelve el backend.

## Requisitos previos

- Node.js 18+ y npm
- El backend TB-CreditFlow corriendo en `http://localhost:8080` con PostgreSQL levantada
- Usuario inicial: `admin / admin` (rol `ADMIN_CREDITO`)

## Cómo correr

```bash
npm install
npm start          # ng serve con proxy a :8080 → abre http://localhost:4200
```

`npm start` usa `proxy.conf.json` para enrutar `/api` → `http://localhost:8080` y evitar CORS.
El `environment.apiBaseUrl` está en `'/api'` para que funcione con el proxy. Para apuntar
directo al backend (sin proxy), cámbialo a `'http://localhost:8080/api'`.

```bash
npm run build      # build de producción → dist/crediflow-web
```

## Ejecutar con Docker

```bash
# # 4) Empaquetar imagen Docker (build multi-stage) y ejecutarla
docker build -t crediflow-frontend:1.0.0 .
docker run --name crediflow-frontend \
  -p 4200:80 \
  -d crediflow-frontend:1.0.0
```

## Mapa rol → pantallas

| Rol | Pantallas | HU |
|---|---|---|
| `ASESOR` | Solicitudes (listar/crear/detalle/estado), Carga de documentos | HU01–HU04 |
| `ANALISTA` | Evaluación (ejecutar y ver) | HU05, HU06 |
| `COMITE` | Evaluación (ver) + Decisión (aprobar/rechazar) | HU08 |
| `ADMIN_CREDITO` | Reglas de scoring (CRUD) | HU07 |
| `AUDITOR`, `CUMPLIMIENTO` | Historial de auditoría | HU09–HU11 |
| `GERENTE` | Tablero de indicadores | HU13 |

## Estructura

```
src/app/
├── core/
│   ├── auth/          # AuthService, interceptor, guards, sesión + mapa de menú
│   ├── http/          # error.interceptor (mapea ApiError, 401→logout)
│   ├── models/        # enums + DTOs (espejo del backend)
│   └── notifications/ # NotificationService + toasts
├── features/          # una carpeta por dominio (login, solicitudes, documentos, …)
│   └── <feature>/     # componente(s) + su service HTTP
├── shared/            # componentes reutilizables (badges, forbidden)
├── app.component.ts   # shell: barra superior + menú por rol
├── app.config.ts      # providers (router, httpClient + interceptores)
└── app.routes.ts      # rutas con lazy loading + guards por rol
```

## Documentación

- [`docs/CrediFlow-Especificacion-Frontend-Angular.md`](docs/CrediFlow-Especificacion-Frontend-Angular.md) — especificación funcional.
- [`docs/GUIA-ANGULAR.md`](docs/GUIA-ANGULAR.md) — **guía de aprendizaje de Angular** explicada sobre este mismo proyecto (para empezar de cero).

## Pruebas

Las pruebas del frontend son **manuales** (checklist §11 de la especificación). No hay gate de cobertura.
