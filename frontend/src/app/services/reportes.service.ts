import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface AsistenciaReporte {
  id: number | string;
  tipo: 'asistencia' | 'horaExtra' | 'evento';
  empleado: string;
  departamento: string;
  fecha: Date;
  entrada: string | null;
  salida: string | null;
  horasTrabajadas: number | null;
  totalPausas: number | null;
  horasExtras: number | null;
  horasExtrasPendiente?: boolean;
  duracionHoraExtra: number | null;
  estado: string;
  motivo?: string;
  descripcionTrabajo?: string | null;
  proyecto?: string | null;
  fotos?: { id: number; tipo: string; url_foto: string }[];
}

export interface ResumenReportes {
  presenteHoy: number;
  totalEmpleados: number;
  horasExtrasAlMes: number;
  promedioPausas: number;
}

export interface CumplimientoEmpleado {
  empleadoId: number;
  nombre: string;
  departamentoId: number;
  departamento: string;
  diasLaborables: number;
  diasReportados: number;
  diasPendientes: number;
  porcentaje: number;
}

export interface CumplimientoDepartamento {
  departamentoId: number;
  departamento: string;
  diasLaborables: number;
  diasReportados: number;
  diasPendientes: number;
  porcentaje: number;
  empleados: CumplimientoEmpleado[];
}

export interface CumplimientoResponse {
  mes: string;
  departamentos: CumplimientoDepartamento[];
}

export interface DetalleCumplimientoEmpleado {
  empleadoId: number;
  nombre: string | null;
  dias: { fecha: string; estado: 'reportado' | 'pendiente' | 'justificado' }[];
}

export interface TecnicoHorasAprobadas {
  empleadoId: number;
  nombre: string;
  departamentoId: number;
  departamento: string;
  totalHoras: number;
  totalTickets: number;
}

export interface DepartamentoHorasAprobadas {
  departamentoId: number;
  departamento: string;
  totalHoras: number;
  tecnicos: TecnicoHorasAprobadas[];
}

export interface HorasAprobadasResponse {
  mes: string;
  departamentos: DepartamentoHorasAprobadas[];
}

export interface DepartamentoStats {
  departamento: string;
  total: number;
  presentes: number;
  promedioHoras: number;
  totalExtras: number;
}

@Injectable({
  providedIn: 'root',
})
export class ReportesService {
  private apiUrl = `${environment.apiUrl}/reportes`;

  constructor(private http: HttpClient) {}

  /**
   * Convierte una fecha a 'YYYY-MM-DD' usando componentes locales.
   * Usar toISOString() aquí desplaza el día en zonas horarias con offset negativo.
   */
  private aFechaParam(fecha: Date | string): string {
    if (typeof fecha === 'string') return fecha.slice(0, 10);
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /**
   * Obtener asistencias con filtros
   */
  obtenerAsistencias(
    page: number = 1,
    limit: number = 20,
    empleadoId?: number,
    fechaInicio?: Date | string,
    fechaFin?: Date | string,
    departamentoId?: number,
    nombreEmpleado?: string,
  ): Observable<any> {
    let url = `${this.apiUrl}/asistencias?page=${page}&limit=${limit}`;

    if (empleadoId) url += `&empleadoId=${empleadoId}`;
    if (nombreEmpleado) url += `&nombreEmpleado=${encodeURIComponent(nombreEmpleado)}`;
    if (fechaInicio) url += `&fechaInicio=${this.aFechaParam(fechaInicio)}`;
    if (fechaFin) url += `&fechaFin=${this.aFechaParam(fechaFin)}`;
    if (departamentoId) url += `&departamentoId=${departamentoId}`;

    return this.http.get<any>(url).pipe(
      map(response => ({
        ...response,
        data: response.data.map((item: any) => ({
          ...item,
          // Convertir strings a números
          horasTrabajadas: typeof item.horasTrabajadas === 'string' 
            ? parseFloat(item.horasTrabajadas) 
            : item.horasTrabajadas,
          totalPausas: typeof item.totalPausas === 'string'
            ? parseFloat(item.totalPausas)
            : item.totalPausas,
          horasExtras: typeof item.horasExtras === 'string'
            ? parseFloat(item.horasExtras)
            : item.horasExtras,
        }))
      }))
    );
  }

  /**
   * Cumplimiento de reportes (días con check-out) del mes, por departamento y empleado
   */
  obtenerCumplimiento(mes: string, departamentoId?: number): Observable<{ exitoso: boolean; data: CumplimientoResponse }> {
    let url = `${this.apiUrl}/cumplimiento?mes=${mes}`;
    if (departamentoId) url += `&departamentoId=${departamentoId}`;
    return this.http.get<{ exitoso: boolean; data: CumplimientoResponse }>(url);
  }

  /**
   * Detalle día por día del cumplimiento de un empleado en un mes
   */
  obtenerDetalleCumplimientoEmpleado(empleadoId: number, mes: string): Observable<{ exitoso: boolean; data: DetalleCumplimientoEmpleado }> {
    return this.http.get<{ exitoso: boolean; data: DetalleCumplimientoEmpleado }>(
      `${this.apiUrl}/cumplimiento/${empleadoId}?mes=${mes}`,
    );
  }

  /**
   * Horas extra aprobadas (total o parcial) del mes, por departamento y técnico
   */
  obtenerHorasAprobadas(mes: string, departamentoId?: number): Observable<{ exitoso: boolean; data: HorasAprobadasResponse }> {
    let url = `${this.apiUrl}/horas-aprobadas?mes=${mes}`;
    if (departamentoId) url += `&departamentoId=${departamentoId}`;
    return this.http.get<{ exitoso: boolean; data: HorasAprobadasResponse }>(url);
  }

  /**
   * Obtener resumen de estadísticas generales
   */
  obtenerResumen(): Observable<{ exitoso: boolean; data: ResumenReportes }> {
    return this.http.get<{ exitoso: boolean; data: ResumenReportes }>(
      `${this.apiUrl}/resumen`,
    );
  }

  /**
   * Obtener MIS asistencias (usuario logueado), sin datos de otros empleados
   */
  obtenerMisAsistencias(
    page: number = 1,
    limit: number = 20,
    fechaInicio?: Date | string,
    fechaFin?: Date | string,
  ): Observable<any> {
    let url = `${this.apiUrl}/mis-asistencias?page=${page}&limit=${limit}`;

    if (fechaInicio) url += `&fechaInicio=${this.aFechaParam(fechaInicio)}`;
    if (fechaFin) url += `&fechaFin=${this.aFechaParam(fechaFin)}`;

    return this.http.get<any>(url).pipe(
      map(response => ({
        ...response,
        data: response.data.map((item: any) => ({
          ...item,
          horasTrabajadas: typeof item.horasTrabajadas === 'string'
            ? parseFloat(item.horasTrabajadas)
            : item.horasTrabajadas,
          totalPausas: typeof item.totalPausas === 'string'
            ? parseFloat(item.totalPausas)
            : item.totalPausas,
          horasExtras: typeof item.horasExtras === 'string'
            ? parseFloat(item.horasExtras)
            : item.horasExtras,
        }))
      }))
    );
  }

  /**
   * Obtener historial de un empleado
   */
  obtenerHistorialEmpleado(empleadoId: number, meses: number = 3): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/empleado/${empleadoId}?meses=${meses}`,
    );
  }

  /**
   * Obtener estadísticas por departamento
   */
  obtenerPorDepartamento(): Observable<{ exitoso: boolean; data: DepartamentoStats[] }> {
    return this.http.get<{ exitoso: boolean; data: DepartamentoStats[] }>(
      `${this.apiUrl}/departamentos`,
    );
  }
}
