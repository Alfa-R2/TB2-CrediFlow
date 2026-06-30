// Interfaces request/response — nombres de campos idénticos al JSON del backend.
import {
  RolNombre,
  EstadoSolicitud,
  NivelRiesgo,
  TipoDoc,
  TipoDocumento,
  AccionDecision,
  AccionAuditoria,
  OperadorRegla,
} from './enums';

// --- Auth ---
export interface LoginRequest {
  username: string;
  password: string;
}
export interface TokenResponse {
  token: string;
  rol: RolNombre;
}

// --- Solicitud ---
export interface ClienteRequest {
  tipoDoc: TipoDoc;
  numDoc: string;
  nombres: string;
  apellidos: string;
  ingresoMensual: number; // BigDecimal -> number
  deudasActuales: number; // BigDecimal -> number
}
export interface CrearSolicitudRequest {
  cliente: ClienteRequest;
  monto: number;
  plazoMeses: number;
}
export interface SolicitudResponse {
  id: number;
  clienteId: number;
  asesorId: number;
  monto: number;
  plazoMeses: number;
  estado: EstadoSolicitud;
  fechaRegistro: string; // ISO LocalDateTime
}
export interface EstadoResponse {
  estado: EstadoSolicitud;
}

// --- Documento ---
export interface DocumentoResponse {
  id: number;
  solicitudId: number;
  tipo: TipoDocumento;
  urlArchivo: string;
  hash: string;
  fechaCarga: string;
}

// --- Evaluación ---
export interface EvaluacionResponse {
  id: number;
  solicitudId: number;
  capacidadPago: number;
  score: number;
  nivelRiesgo: NivelRiesgo;
  justificacion: string;
  fecha: string;
}
export interface DecisionRequest {
  accion: AccionDecision;
}

// --- Reglas de scoring ---
export interface ReglaScoringRequest {
  nombre: string;
  parametro: string;
  operador: OperadorRegla;
  umbral: number;
  ponderacion: number;
  activa: boolean;
}
export interface ReglaScoringResponse extends ReglaScoringRequest {
  id: number;
}

// --- Auditoría ---
export interface RegistroAuditoriaResponse {
  id: number;
  solicitudId: number;
  accion: AccionAuditoria;
  usuario: string;
  fecha: string;
  hashIntegridad: string;
  hashPrevio: string;
}

// --- Reportes ---
export interface ReporteIndicadores {
  totalSolicitudes: number;
  aprobadas: number;
  rechazadas: number;
  porcentajeAprobacion: number;
  tiempoPromedioDias: number;
  distribucionRiesgo: Record<string, number>; // "BAJO"|"MEDIO"|"ALTO" -> conteo
}

// --- Error estándar del backend ---
export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
}
