# CrediFlow — Sistema de diseño Dark/Light

> Implementado 2026-07-10. Dark mode por defecto, con toggle persistente a Light mode.
> Sin Tailwind: CSS nativo con variables, extendiendo el mismo enfoque que ya usaba
> `styles.css` (mismos nombres de variable, cero dependencias nuevas).

## Arquitectura

- **`src/app/core/theme/theme.service.ts`** — signal `theme: 'dark' | 'light'`, persiste en
  `localStorage['crediflow.theme']`, por defecto `'dark'`. `toggle()` alterna la clase
  `theme-light` en `<html>` (`document.documentElement`).
- **`src/styles.css`** — variables en `:root` (valores dark, por defecto) con override completo
  en `:root.theme-light` (valores light). Mismos nombres de variable de siempre
  (`--bg`, `--surface`, `--primary`, `--green`, `--orange`, `--red`, `--text`, etc.) más una
  variable nueva `--surface-alt` (paneles secundarios) y el trío `--cta`/`--cta-dark`/`--cta-glow`.
- **`app.component.ts`** — botón `.theme-toggle` (☀️/🌙) en el topbar, junto al chip de rol y
  "Salir".

## Paleta

| Variable | Dark (default) | Light | Uso |
|---|---|---|---|
| `--bg` | `#0b0d10` | `#f1f3f5` | Fondo de página |
| `--surface` | `#16181d` | `#ffffff` | Cards |
| `--surface-alt` | `#1d2027` | `#f8f9fa` | Paneles secundarios (inputs, upload-box, tablas) |
| `--primary` (azul eléctrico) | `#2f8fff` | `#1c7ed6` | Títulos de sección, topbar, enlaces, focus |
| `--green` (verde neón/lima) | `#3ddc84` | `#2f9e44` | Éxito financiero (aprobación, saldos positivos) |
| `--orange` (ámbar) | `#f0a93b` | `#f08c00` | Riesgo MEDIO, advertencias — **no confundir con `--cta`** |
| `--red` | `#f1555a` | `#e03131` | Rechazo, errores |
| `--cta` (dorado/coral) | `#f5b301` | `#d9480f` | **Solo** botones `.btn-cta` (acciones críticas) |

**Regla respetada:** `--orange` (advertencia/riesgo) y `--cta` (dorado, acción crítica) son
variables e hue distintos a propósito — la especificación pide reservar el dorado/coral
*exclusivamente* para CTAs, sin mezclarlo con los badges de estado que ya usaban naranja.

## Componentes nuevos

- `.btn-cta` — botón dorado con `box-shadow` de glow suave en `:hover` (transición, no animación
  continua; respeta `prefers-reduced-motion`). Usado en `reportes.component.ts` ("Actualizar
  indicadores") como demo — aplicable a futuros CTAs reales como "Solicitar crédito"/"Simular
  cuota" si se agregan esas pantallas.
- `.accent-blue` / `.accent-green` / `.accent-red` — utilidades para resaltar cifras financieras
  según la jerarquía visual del brief (azul = identidad/neutral, verde = positivo, rojo = negativo).

## Correcciones necesarias para que el toggle funcionara en TODA la app

Estos componentes tenían colores hex hardcodeados en su `styles: [...]` (no reaccionaban al
cambio de tema) y se corrigieron a variables CSS:
- `documentos.component.ts` (`.upload-box`)
- `evaluacion.component.ts` (`.score-bar`, `.justif`)
- `reportes.component.ts` (`.bar-track`)

## Verificado visualmente

- Login, Solicitudes (lista), Documentos, Evaluación (con el fix de estado del punto 1 anterior
  intacto) y Reportes/Indicadores — en dark y light, con toggle en vivo.
- El toggle persiste correctamente entre logins (localStorage, independiente de la sesión JWT).
- Sin cajas grises residuales ni contrastes rotos tras el cambio global de paleta.
