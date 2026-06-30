import { RolNombre } from '../models/enums';

export interface Session {
  token: string;
  rol: RolNombre;
  username: string | null;
}

/** Entrada del menú de navegación (se filtra por rol tras el login). */
export interface MenuItem {
  label: string;
  path: string;
  roles: RolNombre[];
}

/**
 * Mapa rol → pantallas accesibles (§6.4 de la especificación).
 * Es la ÚNICA fuente de verdad del menú; los guards de ruta usan los mismos roles.
 */
export const MENU: MenuItem[] = [
  { label: 'Solicitudes', path: '/solicitudes', roles: ['ASESOR'] },
  { label: 'Nueva solicitud', path: '/solicitudes/nueva', roles: ['ASESOR'] },
  { label: 'Evaluación', path: '/evaluacion', roles: ['ANALISTA', 'COMITE'] },
  { label: 'Reglas de scoring', path: '/reglas', roles: ['ADMIN_CREDITO'] },
  { label: 'Auditoría', path: '/auditoria', roles: ['AUDITOR', 'CUMPLIMIENTO'] },
  { label: 'Indicadores', path: '/reportes', roles: ['GERENTE'] },
];

/** Ruta inicial sugerida tras el login según el rol. */
export function landingForRole(rol: RolNombre): string {
  const first = MENU.find((m) => m.roles.includes(rol));
  return first ? first.path : '/forbidden';
}
