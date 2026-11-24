import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface EmpleadoFichaAusencias {
  empleadoId: number;
  nombre: string;
  departamento: string;
  diasVacacionesPendientes: number;
}

export type TipoDiaAusencia = 'vacaciones' | 'permiso' | 'reposicion' | 'otros' | 'falta';

export interface DiaAusencia {
  fecha: string;
  tipo: TipoDiaAusencia;
}

export interface HistorialAusencia {
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  dias: number;
  motivo: string | null;
  aprobadoPor: string | null;
}

export interface FichaAusenciasEmpleado {
  empleado: {
    id: number;
    nombre: string;
    departamento: string;
    cargo: string | null;
    fechaIngreso: string | null;
  };
  anio: number;
  resumen: {
    vacaciones: { diasDisponibles: number; diasUsados: number; cupoAnual: number };
    permiso: { eventos: number; dias: number };
    reposicion: { eventos: number; dias: number };
    otros: { eventos: number; dias: number };
    faltas: { dias: number };
  };
  dias: DiaAusencia[];
  historial: HistorialAusencia[];
}

@Injectable({ providedIn: 'root' })
export class FichaAusenciasService {
  private apiUrl = `${environment.apiUrl}/reportes/ausencias`;

  constructor(private http: HttpClient) {}

  listarEmpleados(
    buscar?: string,
    filtro?: 'saldo_alto' | 'con_faltas',
  ): Observable<{ exitoso: boolean; data: EmpleadoFichaAusencias[] }> {
    const params: string[] = [];
    if (buscar) params.push(`buscar=${encodeURIComponent(buscar)}`);
    if (filtro) params.push(`filtro=${filtro}`);
    const query = params.length ? `?${params.join('&')}` : '';
    return this.http.get<{ exitoso: boolean; data: EmpleadoFichaAusencias[] }>(`${this.apiUrl}/empleados${query}`);
  }

  obtenerFicha(empleadoId: number, anio: number): Observable<{ exitoso: boolean; data: FichaAusenciasEmpleado }> {
    return this.http.get<{ exitoso: boolean; data: FichaAusenciasEmpleado }>(
      `${this.apiUrl}/empleados/${empleadoId}?anio=${anio}`,
    );
  }
}
