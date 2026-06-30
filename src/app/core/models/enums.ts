// Enums — espejo exacto de los del backend TB-CreditFlow.

export type RolNombre =
  | 'ASESOR'
  | 'ANALISTA'
  | 'ADMIN_CREDITO'
  | 'COMITE'
  | 'CUMPLIMIENTO'
  | 'AUDITOR'
  | 'GERENTE';

export type EstadoSolicitud = 'REGISTRADA' | 'EVALUADA' | 'APROBADA' | 'RECHAZADA';
export type NivelRiesgo = 'BAJO' | 'MEDIO' | 'ALTO';
export type TipoDoc = 'DNI' | 'CE' | 'RUC';
export type TipoDocumento = 'BOLETA_PAGO' | 'ESTADO_FINANCIERO';
export type AccionDecision = 'APROBAR' | 'RECHAZAR';
export type AccionAuditoria = 'APROBADA' | 'RECHAZADA';
export type OperadorRegla = 'GT' | 'LT' | 'EQ';
export type EstadoUsuario = 'ACTIVO' | 'INACTIVO';
