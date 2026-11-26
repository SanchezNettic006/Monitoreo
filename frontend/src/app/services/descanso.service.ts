import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface EmpleadoEquipo {
  id: number;
  nombre: string;
}

export interface DescansoEmpleado {
  id: number;
  empleado_id: number;
  empleado_nombre: string;
  fecha: string;
}

@Injectable({
  providedIn: 'root',
})
export class DescansoService {
  private apiUrl = `${environment.apiUrl}/descansos`;

  constructor(private http: HttpClient) {}

  /** Empleados de mi equipo (líder: su departamento; admin: todos), para elegir a quién marcarle descanso */
  listarEmpleados(): Observable<EmpleadoEquipo[]> {
    return this.http
      .get<{ exitoso: boolean; data: EmpleadoEquipo[] }>(`${this.apiUrl}/empleados`)
      .pipe(map((r) => r.data || []));
  }

  /** Descansos del equipo en un mes ('YYYY-MM') */
  listarPorMes(mes: string): Observable<DescansoEmpleado[]> {
    return this.http
      .get<{ exitoso: boolean; data: DescansoEmpleado[] }>(`${this.apiUrl}?mes=${mes}`)
      .pipe(map((r) => r.data || []));
  }

  /** Descansos del equipo en un año completo, para la vista anual del calendario */
  listarPorAnio(anio: number): Observable<DescansoEmpleado[]> {
    return this.http
      .get<{ exitoso: boolean; data: DescansoEmpleado[] }>(`${this.apiUrl}?anio=${anio}`)
      .pipe(map((r) => r.data || []));
  }

  crear(empleadoId: number, fecha: string): Observable<DescansoEmpleado> {
    return this.http
      .post<{ exitoso: boolean; data: DescansoEmpleado }>(this.apiUrl, { empleado_id: empleadoId, fecha })
      .pipe(map((r) => r.data));
  }

  eliminar(id: number): Observable<{ id: number }> {
    return this.http
      .delete<{ exitoso: boolean; data: { id: number } }>(`${this.apiUrl}/${id}`)
      .pipe(map((r) => r.data));
  }

  /** Empleados con descanso marcado hoy, para los resúmenes de asistencia del día */
  obtenerDescansosHoy(): Observable<{ empleado_id: number; nombre_completo: string }[]> {
    return this.http
      .get<{ exitoso: boolean; data: { empleado_id: number; nombre_completo: string }[] }>(`${this.apiUrl}/hoy`)
      .pipe(map((r) => r.data || []));
  }
}
