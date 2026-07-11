# CrediFlow — Mejoras pendientes del Frontend (hallazgos de auditoría)

> Generado a partir de una revisión cruzada completa: `TB1-CreditFlow` (controllers, services,
> SecurityConfig, GlobalExceptionHandler) vs. `TB2-CrediFlow` (servicios, componentes, guards,
> interceptores). Se respeta la premisa de arquitectura ya definida en
> `CrediFlow-Especificacion-Frontend-Angular.md`: Angular es un **cliente delgado sin lógica de
> negocio**; todas las correcciones de abajo son de **reflejo de estado**, no de cálculo.

## Estado general

- **Servicios HTTP** (`solicitud.service.ts`, `documento.service.ts`, `evaluacion.service.ts`,
  `regla-scoring.service.ts`, `auditoria.service.ts`, `reporte.service.ts`): **100% alineados**
  con los controllers reales del backend (paths, verbos, payloads, params). Sin cambios pendientes.
- **Core** (dtos.ts, enums.ts, guards, interceptores, environment/proxy): alineado con el backend.
- **Componentes**: aquí sí hay gaps de UX/estado. Ver checklist abajo.

---

## Checklist priorizado

### ✅ 1. `evaluacion.component.ts` — botones Aprobar/Rechazar no reflejan el estado real de la solicitud — **RESUELTO Y VERIFICADO (2026-07-10)**
- **Archivo:** `src/app/features/evaluacion/evaluacion.component.ts` (líneas ~54-62, 173-182)
- **Problema:** el componente solo consulta la `EvaluacionRiesgo` (`GET …/evaluacion`), nunca el
  estado de la `Solicitud`. Muestra los botones de decisión con la sola condición
  `esComite() && evaluacion()`, sin importar si la solicitud sigue en `EVALUADA` o ya es
  `APROBADA`/`RECHAZADA`. Backend: `SolicitudService.decidir()` exige `EVALUADA` (409 si no).
  Confirmado también que `ScoringService.evaluar()` exige `REGISTRADA` (una sola evaluación por
  solicitud, ver `ScoringService.java:48-51`).
- **Consecuencia:** un COMITE puede abrir una evaluación ya decidida (navegación directa por URL,
  refresco, revisar más tarde) y ver los botones activos; al pulsar, el backend responde 409 y el
  toast es confuso ("operación no permitida").
- **Nota de diseño:** el checklist manual original (§11 de `CrediFlow-Especificacion-Frontend-Angular.md`)
  daba esto por aceptable ("segunda decisión muestra 409"), pero es una mejora de UX legítima y
  **no viola** "cero lógica de negocio": el componente ya recibe `estado` en `SolicitudResponse`,
  solo hay que leerlo y ocultar/deshabilitar los botones — no se decide nada, se refleja un dato
  que el backend ya devuelve.
- **Fix aplicado:** en `ngOnInit`, además de `evaluacion.ver()`, se llama a
  `solicitudService.obtener(id)` (no `.estado(id)`, que es solo-ASESOR y daría 403 a COMITE) y se
  guarda `estado` en el signal `solicitudEstado`. Los botones ahora se muestran solo si
  `puedeDecidir()` (`esComite() && solicitudEstado() === 'EVALUADA'`); si no, se muestra
  "Esta solicitud ya fue APROBADA/RECHAZADA; no admite una nueva decisión.". Tras `decidir()` se
  actualiza `solicitudEstado` con la respuesta, ocultando los botones sin recargar.
- **Verificado en vivo** (backend + frontend levantados, flujo completo asesor→analista→comité con
  la solicitud de ejemplo ingreso=10000/deudas=4200/monto=71000/plazo=24 → score 45/MEDIO, igual
  que el ejemplo de la especificación):
  1. COMITE ve los botones cuando la solicitud está `EVALUADA`.
  2. Al aprobar, los botones desaparecen al instante y se reemplazan por el mensaje de estado — sin
     necesidad de recargar.
  3. Recargando la página completa (`F5`) el mensaje se mantiene correcto (estado leído fresco del
     backend vía `GET /solicitudes/{id}`, no de memoria local) — ya no es posible reintentar la
     decisión y disparar el 409 confuso.

### 🟡 2. `reglas.component.ts` — campo `parametro` es texto libre
- **Archivo:** `src/app/features/reglas/reglas.component.ts` (líneas 27-30)
- **Problema:** `<input type="text">` en vez de `<select>`. Backend (`CrediFlow-Especificacion-Fase2.md`
  §2.6) solo acepta `ratioEndeudamiento` | `ratioCuota` exactos; cualquier otro valor → 400.
- **Fix propuesto:** reemplazar por `<select>` con esas dos opciones, igual que ya se hace con
  `operador`.

### 🟡 3. Documentos ya cargados no se pueden listar tras recargar
- **Archivo:** `src/app/features/documentos/documento.service.ts` + `documentos.component.ts:93`
- **Problema:** `documentos()` solo acumula lo subido en la sesión del navegador; no hay
  `GET /api/solicitudes/{id}/documentos` en el backend (confirmado revisando `SolicitudController.java`
  completo: solo existe `POST .../documentos`).
- **Este no es un bug de frontend — es un hueco de API.** Para resolverlo de verdad hace falta:
  1. Backend: agregar `GET /api/solicitudes/{id}/documentos` (rol ASESOR, mismo criterio que el resto
     de origination) que devuelva `List<DocumentoResponse>`.
  2. Frontend: `documento.service.ts` añade `listar(solicitudId)`; `documentos.component.ts` la
     llama en `ngOnInit` en vez de partir de una lista vacía.
- **Decisión pendiente del usuario:** ¿se toca también el backend (TB1) o se deja como limitación
  conocida y documentada?

### 🟢 4. `solicitud-list.component.ts` — falta filtro por `clienteId` en la UI
- **Archivo:** `src/app/features/solicitudes/solicitud-list.component.ts`
- El servicio y el backend ya soportan `clienteId` como filtro combinable con `estado`; la UI solo
  expone `estado`. Agregar un campo numérico más junto al select de estado.

### 🟢 5. `reglas.component.ts` — `confirm()` nativo del navegador
- **Archivo:** `src/app/features/reglas/reglas.component.ts:194`
- Rompe la consistencia visual con el resto de la app (que usa `NotificationService`/toasts).
  Reemplazar por un modal de confirmación propio, o al menos por un patrón coherente con el resto
  de la UI. Cosmético, no bloqueante.

### 🔵 6. Oportunidad no explotada — verificación de integridad de la cadena de auditoría
- **Backend:** `AuditService.verificarCadena()` (`AuditService.java:48-66`) ya implementa la
  verificación HU11 (no repudio) pero **no está expuesta por ningún endpoint** — no aparece en
  `AuditoriaController`.
- **Idea de mejora conjunta:** agregar `GET /api/auditoria/verificar` (rol AUDITOR/CUMPLIMIENTO,
  igual que la consulta) que devuelva `{ integra: boolean }`, y en `auditoria.component.ts` un
  botón "Verificar integridad de la cadena" que lo consuma. Esto es valor real para la tesis (HU11
  es "no repudio", y hoy no hay forma de demostrarlo desde la UI).

---

## Confirmaciones (sin cambios necesarios)

- `AuditoriaConsultaService`: filtro de fechas inclusive en ambos extremos — coincide con
  `auditoria.component.ts` (inputs `type="date"` mandan `yyyy-MM-dd`, que es lo que
  `@DateTimeFormat(iso=ISO.DATE)` espera).
- `ReporteService`: fórmulas de `porcentajeAprobacion`, `tiempoPromedioDias`, `distribucionRiesgo`
  (siempre las 3 claves) — coinciden con lo que pinta `reportes.component.ts`.
- `GlobalExceptionHandler`: cuerpo uniforme de error — coincide con `ApiError` del frontend y con
  el switch de `error.interceptor.ts`.
- Guards de ruta (`app.routes.ts`) y menú (`app.component.ts`) — coinciden exactamente con la
  matriz de roles del backend (`SecurityConfig.java`).

---

## Orden de trabajo sugerido

1. Punto 1 (crítico, toca el flujo de decisión — HU08).
2. Punto 2 (rápido, evita 400 evitables en HU07).
3. Punto 4 y 5 (rápidos, bajo riesgo).
4. Punto 3 y 6 requieren decidir primero si se toca también el backend (TB1-CreditFlow).
