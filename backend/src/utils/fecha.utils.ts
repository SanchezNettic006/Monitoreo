/**
 * Utilidades para manejar columnas de tipo 'date' (sin hora) sin desfases de zona horaria
 */

/** Convierte a 'YYYY-MM-DD' usando componentes locales, sin pasar por conversión UTC */
export function formatFechaLocal(fecha: Date | string): string {
  if (typeof fecha === 'string') return fecha.slice(0, 10);
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Formatea una fecha (Date o 'YYYY-MM-DD') para mostrar, sin desfase por zona horaria */
export function formatFechaDisplay(fecha: Date | string, locale: string = 'es-ES'): string {
  const fechaStr = formatFechaLocal(fecha);
  return new Date(`${fechaStr}T00:00:00`).toLocaleDateString(locale);
}

/** Fecha de hoy en la zona horaria del servidor, como 'YYYY-MM-DD' */
export function hoyLocal(): string {
  return formatFechaLocal(new Date());
}

/**
 * Normaliza un parámetro de fecha recibido por query string a 'YYYY-MM-DD'.
 * Acepta 'YYYY-MM-DD' o un ISO completo ('YYYY-MM-DDTHH:mm:ss.sssZ').
 */
export function normalizarFechaParam(valor?: string): string | undefined {
  if (!valor) return undefined;
  const fecha = valor.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : undefined;
}

/**
 * Resuelve el timestamp real de una acción (check-in/out, hora extra) que puede
 * haberse capturado sin señal y sincronizarse minutos u horas después.
 * Si `capturadoEn` es un ISO válido, no está en el futuro (con 5 min de tolerancia
 * por desfase de reloj) y no es más viejo que 72 horas, se usa tal cual —así el
 * registro refleja el momento real en campo, no el instante de la sincronización.
 * En cualquier otro caso (ausente, inválido, fuera de rango) se usa la hora del servidor.
 */
export function resolverFechaCaptura(capturadoEn?: string): Date {
  const ahora = new Date();
  if (!capturadoEn) return ahora;

  const fecha = new Date(capturadoEn);
  if (isNaN(fecha.getTime())) return ahora;

  const TOLERANCIA_FUTURO_MS = 5 * 60 * 1000;
  const MAX_ANTIGUEDAD_MS = 72 * 60 * 60 * 1000;
  const diffMs = ahora.getTime() - fecha.getTime();

  if (diffMs < -TOLERANCIA_FUTURO_MS || diffMs > MAX_ANTIGUEDAD_MS) {
    return ahora;
  }

  return fecha;
}

/** Enumera cada fecha 'YYYY-MM-DD' entre inicio y fin (inclusive) */
export function enumerarFechas(inicio: string, fin: string): string[] {
  const fechas: string[] = [];
  const cursor = new Date(`${inicio.slice(0, 10)}T00:00:00Z`);
  const finDate = new Date(`${fin.slice(0, 10)}T00:00:00Z`);

  while (cursor <= finDate) {
    fechas.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return fechas;
}
