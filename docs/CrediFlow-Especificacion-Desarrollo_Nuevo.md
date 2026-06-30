# CrediFlow — Especificación Técnica para Desarrollo (Backend) <https://github.com/Alfa-R2/TB1-CreditFlow>

> **Propósito de este documento.** Es la fuente única de verdad para **implementar** el backend
> de CrediFlow y para **verificar** que la implementación es correcta. Está escrito para que un
> agente (Claude en IntelliJ IDEA) lo desarrolle paso a paso y para que el desarrollador a cargo
> compruebe cada entregable contra criterios objetivos.
>
> **Alcance:** Backend (Spring Boot). El frontend Angular es un cliente separado; aquí solo se
> definen la API y CORS. **Regla de oro:** si algo no está en este documento, NO se inventa — se
> pregunta. Mantener nombres de campos/endpoints **exactos**.

## Tabla de contenido
1. [Stack y convenciones](#1-stack-y-convenciones)
2. [Arquitectura y estructura de paquetes](#2-arquitectura-y-estructura-de-paquetes)
3. [Modelo de datos (entidades y enums)](#3-modelo-de-datos)
4. [Reglas de negocio](#4-reglas-de-negocio)
5. [API REST (contratos)](#5-api-rest-contratos)
6. [Seguridad y matriz de acceso](#6-seguridad-y-matriz-de-acceso)
7. [Manejo de errores](#7-manejo-de-errores)
8. [Historias de usuario ↔ implementación](#8-historias-de-usuario--implementación)
9. [Pruebas y cobertura](#9-pruebas-y-cobertura)
10. [Plan de construcción por fases](#10-plan-de-construcción-por-fases)
11. [Cómo ejecutar](#11-cómo-ejecutar)
12. [Checklist de verificación (para el desarrollador)](#12-checklist-de-verificación)

---

## 1. Stack y convenciones

| Aspecto | Decisión |
|---|---|
| Lenguaje / runtime | Java 17 (**OpenJDK / Temurin**) |
| Framework | Spring Boot 4.1.0 (Spring Framework 7, Spring Security 7) |
| Web | Spring Web (MVC) + Bean Validation (`jakarta.validation`) |
| Persistencia | Spring Data JPA / Hibernate |
| Base de datos | PostgreSQL (**una sola BD**); H2 en memoria para pruebas |
| Seguridad | Spring Security + JWT (librería `io.jsonwebtoken:jjwt`) |
| Hash | `java.security.MessageDigest` (SHA-256) — sin dependencias |
| Pruebas | JUnit 5 + Mockito + JaCoCo (cobertura ≥ 80%) |
| Build / CI | Maven + Git/GitHub + GitHub Actions + Docker (1 imagen) |
| Calidad | SonarQube Community Edition |

**Convenciones:**
- Base path de la API: **`/api`**. Formato: **JSON** (UTF-8). Fechas: ISO-8601.
- Dinero: `BigDecimal`. Identificadores: `Long` autogenerado.
- Autenticación: header `Authorization: Bearer <JWT>`.
- Cada operación de escritura corre en transacción (`@Transactional`).
- Nombres en español de dominio tal como en el modelo (p. ej. `Solicitud`, `EvaluacionRiesgo`).

> **Nota técnica (stack real del proyecto).** El andamiaje está sobre **Spring Boot 4.1.0**
> (Spring Framework 7, Spring Security 7). Implicaciones respecto a Boot 3, todas **internas** (no
> alteran endpoints, campos ni códigos del documento):
> - La serialización JSON usa **Jackson 3** (`tools.jackson.databind`), no Jackson 2
>   (`com.fasterxml.jackson`, presente solo de forma transitiva vía `jjwt-jackson`).
> - Starters divididos: `spring-boot-starter-webmvc` (+ `spring-boot-starter-jackson`); en pruebas
>   `spring-boot-starter-webmvc-test` y `spring-boot-starter-data-jpa-test`.
> - Algunas autoconfiguraciones cambiaron de paquete (p. ej. `@AutoConfigureMockMvc` en
>   `org.springframework.boot.webmvc.test.autoconfigure`; seguridad en
>   `org.springframework.boot.security.autoconfigure`). Se excluye `UserDetailsServiceAutoConfiguration`
>   porque la autenticación es manual (AuthService + filtro JWT).

---

## 2. Arquitectura y estructura de paquetes

**Estilo:** aplicación **monolítica modular por capas** (REST · Services · Repositories ·
Domain). Los módulos son paquetes Java dentro de un solo despliegue; se comunican por
**inyección de servicios (beans de Spring)**, NO por HTTP. Una sola base de datos PostgreSQL.

```
com.crediflow
├── CrediFlowApplication.java
├── config/            # SecurityConfig (JWT), CorsConfig, DataSeeder (bootstrap), OpenAPI
├── common/            # ApiError, excepciones, GlobalExceptionHandler, utilidad HashUtil
├── security/          # módulo Seguridad (HU12)
│   ├── controller/    # AuthController
│   ├── service/       # AuthService, JwtService, UsuarioService
│   ├── repository/    # UsuarioRepository, RolRepository
│   └── domain/        # Usuario, Rol, dtos (LoginRequest, TokenResponse)
├── origination/       # módulo Solicitudes (HU01–HU04)
│   ├── controller/ service/ repository/ domain/   # Cliente, Solicitud, Documento
├── scoring/           # módulo Scoring (HU05–HU08)
│   ├── controller/ service/ repository/ domain/   # EvaluacionRiesgo, ReglaScoring
├── audit/             # módulo Auditoría (HU09–HU11)
│   ├── controller/ service/ repository/ domain/   # RegistroAuditoria
└── reporting/         # módulo Reportes (HU13, solo lectura)
    └── controller/ service/
```

**Responsabilidad por capa:**
- **Controller:** expone REST, valida entrada (`@Valid`), traduce a HTTP. Sin lógica de negocio.
- **Service:** lógica de negocio, transacciones, orquestación entre módulos.
- **Repository:** Spring Data JPA.
- **Domain:** entidades JPA, enums y DTOs.

**Dependencias entre módulos (permitidas):** `scoring` → `origination` (lee Solicitud/Cliente);
`scoring`/`origination` → `audit` (registra decisión); todos → `security` (usuario actual);
`reporting` → (lectura de los demás repos). `audit` no depende de nadie (aislado).

---

## 3. Modelo de datos

Una sola BD relacional. Tipos sugeridos para JPA. Todas las entidades tienen `id Long` autogenerado (PK).

### Enums
```
EstadoSolicitud : REGISTRADA, EVALUADA, APROBADA, RECHAZADA
NivelRiesgo     : BAJO, MEDIO, ALTO
OperadorRegla   : GT, LT, EQ
AccionAuditoria : APROBADA, RECHAZADA
TipoDocumento   : BOLETA_PAGO, ESTADO_FINANCIERO        (Documento.tipo)
TipoDoc         : DNI, CE, RUC                          (Cliente.tipoDoc)
EstadoUsuario   : ACTIVO, INACTIVO
RolNombre       : ASESOR, ANALISTA, ADMIN_CREDITO, COMITE, CUMPLIMIENTO, AUDITOR, GERENTE
```

### Entidades

**Cliente** (origination) — restricción única `(tipoDoc, numDoc)`
| campo | tipo | notas |
|---|---|---|
| id | Long | PK |
| tipoDoc | TipoDoc | obligatorio |
| numDoc | String | obligatorio; único junto con tipoDoc |
| nombres | String | obligatorio |
| apellidos | String | obligatorio |
| ingresoMensual | BigDecimal | ≥ 0 |
| deudasActuales | BigDecimal | ≥ 0 |

**Solicitud** (origination)
| campo | tipo | notas |
|---|---|---|
| id | Long | PK |
| cliente | Cliente (`@ManyToOne`, LAZY) | obligatorio; columna FK `cliente_id` |
| asesor | Usuario (`@ManyToOne`, LAZY) | quien registra; columna FK `asesor_id` |
| monto | BigDecimal | > 0 |
| plazoMeses | Integer | > 0 |
| estado | EstadoSolicitud | default `REGISTRADA` |
| fechaRegistro | LocalDateTime | set al crear |

**Documento** (origination)
| campo | tipo | notas |
|---|---|---|
| id | Long | PK |
| solicitud | Solicitud (`@ManyToOne`, LAZY) | columna FK `solicitud_id` |
| tipo | TipoDocumento | |
| urlArchivo | String | ruta en disco |
| hash | String(64) | SHA-256 del contenido |
| fechaCarga | LocalDateTime | |

**EvaluacionRiesgo** (scoring) — `solicitudId` único (1 evaluación vigente por solicitud)
| campo | tipo | notas |
|---|---|---|
| id | Long | PK |
| solicitud | Solicitud (`@OneToOne`, LAZY) | columna FK `solicitud_id`, única (1 evaluación por solicitud) |
| capacidadPago | BigDecimal | |
| score | Integer | 0–100 |
| nivelRiesgo | NivelRiesgo | |
| justificacion | String (text) | reglas aplicadas + efecto |
| fecha | LocalDateTime | |

**ReglaScoring** (scoring)
| campo | tipo | notas |
|---|---|---|
| id | Long | PK |
| nombre | String | descriptivo |
| parametro | String | `ratioEndeudamiento` \| `ratioCuota` |
| operador | OperadorRegla | GT / LT / EQ |
| umbral | BigDecimal | |
| ponderacion | Integer | con signo (penaliza/bonifica) |
| activa | Boolean | |

**RegistroAuditoria** (audit) — **append-only** (sin update/delete)
| campo | tipo | notas |
|---|---|---|
| id | Long | PK |
| solicitudId | Long | id de la Solicitud (sin asociación JPA — `audit` aislado, §2) |
| accion | AccionAuditoria | APROBADA / RECHAZADA |
| usuario | String | username del que decide (estable) |
| fecha | LocalDateTime | |
| hashIntegridad | String(64) | SHA-256 encadenado (ver §4.6) |
| hashPrevio | String(64) | hash del registro anterior (para verificar la cadena) |

> `hashPrevio` no aparecía en la tabla del informe pero es necesario para la cadena; persistirlo
> permite verificar la integridad. Es un detalle de implementación.

**Usuario** (security)
| campo | tipo | notas |
|---|---|---|
| id | Long | PK |
| username | String | único |
| passwordHash | String | BCrypt |
| rol | Rol (`@ManyToOne`) | obligatorio; columna FK `rol_id` |
| estado | EstadoUsuario | ACTIVO/INACTIVO |

**Rol** (security): `id`, `nombre` (RolNombre, único), `descripcion`.

### Relaciones (cardinalidad conceptual)
> Cardinalidad **lógica del dominio**. No todas se materializan como FK/asociación JPA — el mapeo
> real (y la excepción de auditoría, que referencia por id sin FK) está en la nota de más abajo.

- Rol 1—N Usuario · Cliente 1—N Solicitud · Usuario 1—N Solicitud (asesor)
- Solicitud 1—N Documento · Solicitud 1—(0..1) EvaluacionRiesgo · Solicitud 1—N RegistroAuditoria
- Usuario 1—N RegistroAuditoria · ReglaScoring: sin FK (tabla de parámetros)

> **Mapeo JPA de las relaciones.** Se mapean como asociaciones **`LAZY`** sobre las columnas FK
> existentes (mismo esquema): `Solicitud`→`Cliente`/`Usuario` y `Documento`→`Solicitud` (`@ManyToOne`),
> `EvaluacionRiesgo`→`Solicitud` (`@OneToOne`), `Usuario`→`Rol` (`@ManyToOne`). **Excepción:**
> `RegistroAuditoria` referencia la solicitud solo por `solicitudId` (Long, sin asociación) para
> mantener `audit` **aislado** (§2). En las respuestas de la API (§5) estos vínculos se siguen
> exponiendo como ids (`clienteId`, `solicitudId`, …).

Diagrama de referencia: `docs/crediflow-er-light.png`.

---

## 4. Reglas de negocio

### 4.1 Ciclo de vida de la Solicitud
```
REGISTRADA ──(POST evaluacion: HU05/06)──► EVALUADA ──(POST decision: HU08)──► APROBADA | RECHAZADA
```
- `APROBADA` y `RECHAZADA` son terminales.
- Cualquier transición no contemplada ⇒ **HTTP 409 Conflict**.
- Pasar a estado terminal **genera** un `RegistroAuditoria` (HU09).

### 4.2 Capacidad de pago (HU05)
```
capacidadPago      = ingresoMensual − deudasActuales
cuotaEstimada      = monto / plazoMeses
ratioEndeudamiento = deudasActuales / ingresoMensual
ratioCuota         = cuotaEstimada / capacidadPago
```
- Si `ingresoMensual == 0` o faltan datos obligatorios ⇒ **HTTP 400** (evita división por cero).
- Si `capacidadPago <= 0` (deudas ≥ ingreso) ⇒ `nivelRiesgo = ALTO`, `score = 0`, **no** se
  calcula `ratioCuota`. Se persiste igualmente la `EvaluacionRiesgo`.
- El resultado se persiste en `EvaluacionRiesgo` y la Solicitud pasa a `EVALUADA`.

### 4.3 Motor de scoring (HU06)
```
score = 100
para cada ReglaScoring con activa = true:
    valor = resolver(parametro)            # ratioEndeudamiento | ratioCuota
    si comparar(valor, operador, umbral):  # GT: >, LT: <, EQ: ==
        score += ponderacion               # con signo
        justificacion += (nombre, efecto)
score = max(0, min(100, score))
```
**Mapeo a nivel:** `score ≥ 70 → BAJO` · `40 ≤ score ≤ 69 → MEDIO` · `score < 40 → ALTO`.

### 4.4 Reglas semilla (se cargan en el bootstrap)
| nombre | parametro | operador | umbral | ponderacion | activa |
|---|---|---|---|---|---|
| Endeudamiento alto | ratioEndeudamiento | GT | 0.40 | −30 | true |
| Cuota alta sobre capacidad | ratioCuota | GT | 0.40 | −25 | true |
| Bajo endeudamiento | ratioEndeudamiento | LT | 0.20 | +10 | true |
| Cuota muy alta sobre capacidad | ratioCuota | GT | 0.60 | −20 | true |

Ejemplo de verificación: ratioEnd=0.42, ratioCuota=0.51 ⇒ 100−30−25 = **45 → MEDIO**.
Perfil extremo: ratioEnd=0.42, ratioCuota=0.65 ⇒ 100−30−25−20 = **25 → ALTO**.

### 4.5 Roles y acceso (HU12) — ver matriz en §6.

### 4.6 Integridad de auditoría (HU09/HU11)
- Repositorio **append-only**: prohibido `update`/`delete` (no exponer dichas operaciones; las de
  modificación se rechazan).
- Sellado encadenado:
  ```
  hashPrevio     = hashIntegridad del último RegistroAuditoria (o "" si es el primero)
  hashIntegridad = SHA-256( id | solicitudId | accion | usuario | fecha | hashPrevio )
  ```
- El `usuario` registrado es **quien ejecuta la decisión** (miembro del COMITE).

### 4.7 Gestión de documentos (HU02)
- Guardar el binario en `./uploads/{solicitudId}/{archivo}`; persistir `urlArchivo` (ruta) y
  `hash` (SHA-256 del contenido).
- Formatos permitidos: **PDF, JPG**; tamaño máximo **5 MB**. Otros ⇒ **HTTP 400**.

### 4.8 Datos iniciales (bootstrap — `config/DataSeeder`)
- Insertar los **7 roles** (RolNombre).
- Insertar **1 usuario administrador** (`admin`, rol `ADMIN_CREDITO`, password BCrypt) si no existe.
- Insertar las **4 reglas semilla** (§4.4) si la tabla está vacía.

---

## 5. API REST (contratos)

Base: `/api`. Todas (excepto login) requieren `Authorization: Bearer <JWT>`. Rol requerido en §6.

### Seguridad
- `POST /api/auth/login` — body `{ "username": "...", "password": "..." }` → `200 { "token": "...", "rol": "ASESOR" }`; credenciales inválidas ⇒ **401**.

### Solicitudes / Documentos (origination)
- `POST /api/solicitudes` — body `{ cliente: { tipoDoc, numDoc, nombres, apellidos, ingresoMensual, deudasActuales }, monto, plazoMeses }` → `201 { id, estado:"REGISTRADA", ... }`. Crea o reutiliza el Cliente por `(tipoDoc,numDoc)`.
- `GET /api/solicitudes/{id}` → `200 Solicitud` | `404`.
- `GET /api/solicitudes/{id}/estado` → `200 { estado }`.
- `GET /api/solicitudes?estado=&clienteId=` → `200 [Solicitud]`.
- `POST /api/solicitudes/{id}/documentos` — `multipart/form-data` (`tipo`, `archivo`) → `201 Documento` | `400` (formato/tamaño).

### Scoring
- `POST /api/solicitudes/{id}/evaluacion` → calcula capacidad + score + nivel, persiste, pasa a `EVALUADA` → `200 EvaluacionRiesgo` | `400` (ingreso 0/datos faltantes) | `409` (estado inválido).
- `GET /api/solicitudes/{id}/evaluacion` → `200 EvaluacionRiesgo` | `404`.
- `GET /api/reglas` · `POST /api/reglas` · `PUT /api/reglas/{id}` · `DELETE /api/reglas/{id}` (CRUD parametrización).

### Decisión (comité)
- `POST /api/solicitudes/{id}/decision` — body `{ "accion": "APROBAR" | "RECHAZAR" }` → cambia
  estado a `APROBADA`/`RECHAZADA`, crea `RegistroAuditoria` → `200 { estado }` | `409` (no estaba `EVALUADA`).

### Auditoría
- `GET /api/auditoria?clienteId=&desde=&hasta=` → `200 [RegistroAuditoria]` (join a Solicitud para filtrar por cliente).

### Reportes
- `GET /api/reportes/indicadores` → `200 { totalSolicitudes, aprobadas, rechazadas, porcentajeAprobacion, tiempoPromedioDias, distribucionRiesgo:{BAJO,MEDIO,ALTO} }`.

---

## 6. Seguridad y matriz de acceso

JWT con rol como authority (`ROLE_<RolNombre>`). 403 si el rol no está autorizado.

| Endpoint | Rol(es) |
|---|---|
| `POST /api/auth/login` | público |
| `POST /api/solicitudes`, `…/documentos`, `GET …/estado`, `GET /api/solicitudes` | ASESOR |
| `POST /api/solicitudes/{id}/evaluacion` | ANALISTA |
| `GET /api/solicitudes/{id}/evaluacion` | ANALISTA, COMITE |
| `GET/POST/PUT/DELETE /api/reglas` | ADMIN_CREDITO |
| `POST /api/solicitudes/{id}/decision` | COMITE |
| `GET /api/auditoria` | AUDITOR, CUMPLIMIENTO |
| `GET /api/reportes/indicadores` | GERENTE |

Password: BCrypt. CORS: permitir el origen del SPA Angular (configurable por propiedad).

---

## 7. Manejo de errores

`GlobalExceptionHandler` (`@RestControllerAdvice`) devuelve un cuerpo uniforme:
```json
{ "timestamp": "...", "status": 400, "error": "Bad Request", "message": "...", "path": "/api/..." }
```
| Situación | HTTP |
|---|---|
| Validación de entrada fallida (Bean Validation) | 400 |
| Ingreso 0 / datos faltantes para cálculo | 400 |
| Formato/tamaño de documento no permitido | 400 |
| No autenticado / token inválido | 401 |
| Rol no autorizado | 403 |
| Recurso no encontrado | 404 |
| Transición de estado inválida / intento de editar auditoría | 409 |

Todos los endpoints y servicios deben tener control de excepciones (requisito del enunciado).

---

## 8. Historias de usuario ↔ implementación

| HU | Módulo | Endpoint(s) | Criterios de aceptación (resumen) | Prueba |
|---|---|---|---|---|
| HU01 | origination | POST /solicitudes | crea con estado REGISTRADA; id único; valida obligatorios; crea/reutiliza Cliente | CP01, CP02 |
| HU02 | origination | POST …/documentos | adjunta PDF/JPG; calcula hash; rechaza formato inválido | — |
| HU03 | origination | (en POST) | valida completitud/formato | CP02 |
| HU04 | origination | GET …/estado | devuelve estado actual | — |
| HU05 | scoring | POST …/evaluacion | calcula capacidad; controla división por cero; persiste | CP03 |
| HU06 | scoring | POST …/evaluacion | score por reglas; mapea a nivel; justificación | CP04 |
| HU07 | scoring | CRUD /reglas | reglas parametrizables | — |
| HU08 | scoring | POST …/decision | comité aprueba/rechaza; estado terminal; dispara auditoría | CP05 |
| HU09 | audit | (servicio) | registro no editable; usuario+fecha+acción+hash | CP05 |
| HU10 | audit | GET /auditoria | filtra por cliente y rango de fechas | CP07 |
| HU11 | audit | (servicio) | hash encadenado, no repudio | CP05 |
| HU12 | security | POST /auth/login | JWT; acceso por rol; credenciales cifradas | CP06 |
| HU13 | reporting | GET …/indicadores | indicadores y tiempos | — |

---

## 9. Pruebas y cobertura

| ID | Escenario | Tipo | Resultado esperado |
|---|---|---|---|
| CP01 | Registro con datos válidos | Integración | 201, estado REGISTRADA |
| CP02 | Registro con datos incompletos | Excepción | 400 con mensaje de validación |
| CP03 | Cálculo de capacidad de pago | Unitaria | capacidad correcta según ingreso/deudas |
| CP04 | Nivel de riesgo alto | Unitaria | score bajo (<40) ⇒ ALTO con justificación |
| CP05 | Registro inmutable de aprobación | Integración | registro con hash; edición rechazada |
| CP06 | Acceso no autorizado por rol | Seguridad | 403 |
| CP07 | Consulta de historial | Funcional | lista filtrada por cliente y fechas |
| CP08 | Cobertura de la suite | Automatizada | cobertura de líneas ≥ 80% (JaCoCo) |

**Metas:** cobertura backend **≥ 80%** (JaCoCo); 100% de CP de prioridad alta aprobados;
0 bugs/vulnerabilidades críticas en SonarQube; control de excepciones en todos los endpoints.

---

## 10. Plan de construcción por fases

> Construir en este orden respeta las dependencias y permite verificar incrementalmente.

**Fase 0 — Andamiaje**
- Proyecto Spring Boot (Maven), `application.yml` (PostgreSQL + perfil `test` con H2), Docker, CI.
- `common/` (ApiError, GlobalExceptionHandler), `config/` (Security, CORS, DataSeeder vacío).
- **DoD:** la app levanta, `/api/auth/login` responde 401 con credenciales falsas.

**Fase 1 — Sprint 1 (HU prioritarias)** en este orden:
1. **HU12 Seguridad** (Usuario, Rol, JWT, login, bootstrap admin+roles). Habilita probar todo lo demás.
2. **HU01 + HU03** (Cliente, Solicitud, validación, create-or-reuse). → CP01, CP02.
3. **HU02** (Documento, upload, hash). 
4. **HU05 + HU06** (EvaluacionRiesgo, capacidad, motor de reglas, reglas semilla). → CP03, CP04.
5. **HU08** (decisión comité, transición de estado) — necesaria para disparar la auditoría.
6. **HU09 + HU11** (RegistroAuditoria append-only + hash encadenado). → CP05.
- **DoD Sprint 1:** flujo extremo a extremo registrar → evaluar → decidir → auditar funciona;
  CP01–CP06 verdes; cobertura ≥ 80% del código de estos módulos.

**Fase 2 — Resto**
- **HU04** (consultar estado), **HU07** (CRUD reglas), **HU10** (consulta auditoría), **HU13** (indicadores). → CP07.
- **DoD:** las 13 HU operativas; CP01–CP08 verdes; SonarQube sin críticos.

---

## 11. Cómo ejecutar

```bash
# Base de datos (Docker)
docker run --name crediflow-db -e POSTGRES_DB=crediflow -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres

# Build + pruebas + cobertura
mvn clean verify           # ejecuta tests + JaCoCo (report en target/site/jacoco/index.html)

# Levantar la app
mvn spring-boot:run        # API en http://localhost:8080/api

# Empaquetar imagen
docker build -t crediflow .
```
`application.yml` debe definir: datasource PostgreSQL, `jwt.secret`, `jwt.expiration`,
`app.uploads.dir=./uploads`, `app.cors.allowed-origins`.

---

## 12. Checklist de verificación

> Para el desarrollador a cargo: marcar cada punto comprobándolo de forma objetiva.

### Arquitectura
- [ ] Paquetes por módulo con 4 capas; controllers sin lógica de negocio.
- [ ] Comunicación entre módulos por beans (sin llamadas HTTP internas).
- [ ] Una sola BD; `audit` sin dependencias salientes a otros módulos.

### Datos y bootstrap
- [ ] Las 8 tablas existen con los campos exactos del §3 (incluido `operador` en ReglaScoring).
- [ ] Al arrancar: 7 roles + usuario admin + 4 reglas semilla presentes.
- [ ] Restricción única `(tipoDoc, numDoc)` en Cliente.

### Reglas de negocio (probar con datos)
- [ ] `capacidadPago = ingreso − deudas`; `ingreso=0 ⇒ 400`; `capacidad≤0 ⇒ ALTO + score 0`.
- [ ] Motor de score: caso ratioEnd 0.42 + ratioCuota 0.51 ⇒ **45 / MEDIO**; perfil extremo ⇒ **ALTO**.
- [ ] Transición inválida (decidir una solicitud no `EVALUADA`) ⇒ **409**.
- [ ] Cada decisión crea un `RegistroAuditoria`; `hashIntegridad` encadenado; no se puede editar/borrar.
- [ ] Documento: PDF/JPG ≤5 MB OK; otro formato ⇒ 400; se calcula hash.

### API y seguridad
- [ ] Endpoints del §5 responden con los códigos del §7.
- [ ] Cada endpoint exige el rol del §6 (acceso indebido ⇒ 403; sin token ⇒ 401).
- [ ] Cuerpo de error uniforme (§7).

### Pruebas
- [ ] CP01–CP08 implementados y verdes.
- [ ] `mvn verify` genera reporte JaCoCo con **cobertura ≥ 80%**.
- [ ] SonarQube: 0 bugs/vulnerabilidades críticas.

### Comandos rápidos de humo (ejemplos)
```bash
# login
curl -s -X POST localhost:8080/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin"}'
# registrar solicitud (con token ASESOR)
curl -s -X POST localhost:8080/api/solicitudes -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"cliente":{"tipoDoc":"DNI","numDoc":"12345678","nombres":"Juan","apellidos":"Pérez","ingresoMensual":4200,"deudasActuales":1750},"monto":30000,"plazoMeses":24}'
# evaluar → esperar nivel MEDIO, score 45
curl -s -X POST localhost:8080/api/solicitudes/1/evaluacion -H "Authorization: Bearer $TOKEN_ANALISTA"
```

---

### Referencias
- Lógica detallada y casos borde: `docs/Especificacion-Funcional-CrediFlow.md` y secciones de
  *Reglas de Negocio* del informe.
- Diagramas: `docs/crediflow-diagramas.drawio` (arquitectura), `docs/crediflow-er-light.png` (ER).
- Auditorías de respaldo: `docs/Auditoria-1-Completa.md`, `docs/Auditoria-2-…`, `docs/Auditoria-3-…`.
