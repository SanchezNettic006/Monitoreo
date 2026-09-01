import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface SolicitudNotification {
  type: 'created' | 'updated';
  message: string;
  status?: 'pendiente' | 'aprobada' | 'rechazada' | 'cancelada';
}

export interface Solicitud {
  id: number;
  empleado_id: number;
  empleado?: {
    id: number;
    nombre: string;
    apellido: string;
    departamento?: {
      id: number;
      nombre: string;
    };
    usuario?: {
      email: string;
    };
  };
  tipo: 'vacaciones' | 'ausencia' | 'cambio_jornada' | 'cita_medica_programada' | 'cita_medica_emergencia';
  estado: 'pendiente' | 'aprobada' | 'rechazada' | 'cancelada';
  fecha_inicio: Date;
  fecha_fin?: Date;
  dias_solicitados: number;
  motivo?: string;
  descripcion?: string;
  url_foto?: string;
  observacion_admin?: string;
  aprobador_id?: number;
  historial?: any[];
  created_at: Date;
  updated_at: Date;
}

export interface SaldoVacaciones {
  empleadoId: number;
  anio: number;
  cupoAnual: number;
  diasUsados: number;
  diasDisponibles: number;
  fechaIngreso: string | null;
}

export interface SaldoVacacionesEmpleado extends SaldoVacaciones {
  nombre: string;
  departamentoId: number;
}

@Injectable({
  providedIn: 'root',
})
export class SolicitudService {
  private apiUrl = `${environment.apiUrl}/solicitudes`;
  private solicitudCreada$ = new Subject<SolicitudNotification>();
  private solicitudActualizada$ = new Subject<SolicitudNotification>();

  constructor(private http: HttpClient) {}

  private aFormData(datos: Partial<Solicitud>, foto: File): FormData {
    const formData = new FormData();
    Object.entries(datos).forEach(([clave, valor]) => {
      if (valor !== null && valor !== undefined) {
        formData.append(clave, String(valor));
      }
    });
    formData.append('foto', foto, foto.name);
    return formData;
  }

  // Observable para notificar cuando se crea una solicitud
  getSolicitudCreadaNotification(): Observable<SolicitudNotification> {
    console.log('📡 [SolicitudService] Suscriptor conectado a solicitudCreada$');
    return this.solicitudCreada$.asObservable();
  }

  // Observable para notificar cuando se actualiza una solicitud
  getSolicitudActualizadaNotification(): Observable<SolicitudNotification> {
    console.log('📡 [SolicitudService] Suscriptor conectado a solicitudActualizada$');
    return this.solicitudActualizada$.asObservable();
  }

  /**
   * Crear nueva solicitud
   */
  crearSolicitud(datos: Partial<Solicitud>, foto?: File | null): Observable<Solicitud> {
    const body: FormData | Partial<Solicitud> = foto ? this.aFormData(datos, foto) : datos;
    return this.http.post<{ exitoso: boolean; data: Solicitud }>(`${this.apiUrl}/crear`, body).pipe(
      tap((response) => {
        console.log('✅ [SolicitudService] Solicitud creada exitosamente');
        const notification: SolicitudNotification = {
          type: 'created',
          message: 'Solicitud creada exitosamente',
        };
        this.solicitudCreada$.next(notification);
        this.solicitudActualizada$.next({ ...notification, type: 'updated' });
      }),
      map(response => response.data),
    );
  }

  /**
   * Obtener mis solicitudes
   */
  obtenerMisSolicitudes(): Observable<Solicitud[]> {
    return this.http.get<{ exitoso: boolean; data: Solicitud[] }>(`${this.apiUrl}/mis-solicitudes`)
      .pipe(
        map(response => response.data || [])
      );
  }

  /**
   * Obtener solicitudes pendientes (admin)
   */
  obtenerSolicitudesPendientes(): Observable<any[]> {
    return this.http.get<{ exitoso: boolean; data: any[] }>(`${this.apiUrl}/pendientes`)
      .pipe(
        map(response => response.data || [])
      );
  }

  /**
   * Reprogramar (cambiar fecha de) una solicitud ya aprobada
   */
  reprogramarSolicitud(
    solicitudId: number,
    nuevaFechaInicio: string,
    nuevaFechaFin?: string,
    motivo?: string,
  ): Observable<Solicitud> {
    return this.http.patch<{ exitoso: boolean; data: Solicitud }>(`${this.apiUrl}/${solicitudId}/reprogramar`, {
      nueva_fecha_inicio: nuevaFechaInicio,
      nueva_fecha_fin: nuevaFechaFin,
      motivo,
    }).pipe(
      tap(() => {
        this.solicitudActualizada$.next({
          type: 'updated',
          message: 'Solicitud reprogramada correctamente',
        });
      }),
      map((response) => response.data),
    );
  }

  /**
   * Obtener solicitudes aprobadas, opcionalmente filtradas por mes ('YYYY-MM')
   * (admin: todas; líder: solo su departamento)
   */
  obtenerSolicitudesAprobadas(mes?: string): Observable<any[]> {
    let url = `${this.apiUrl}/aprobadas`;
    if (mes) url += `?mes=${mes}`;
    return this.http.get<{ exitoso: boolean; data: any[] }>(url)
      .pipe(
        map(response => response.data || [])
      );
  }

  /**
   * Cambiar estado de una solicitud
   */
  cambiarEstado(
    solicitudId: number,
    estado: string,
    comentario?: string,
    observacion_admin?: string,
  ): Observable<Solicitud> {
    return this.http.patch<Solicitud>(`${this.apiUrl}/${solicitudId}/estado`, {
      estado_nuevo: estado,
      comentario,
      observacion_admin,
    }).pipe(
      tap(() => {
        const status = estado as 'pendiente' | 'aprobada' | 'rechazada' | 'cancelada';
        this.solicitudActualizada$.next({
          type: 'updated',
          status,
          message: estado === 'aprobada'
            ? 'Solicitud aprobada correctamente'
            : estado === 'rechazada'
              ? 'Solicitud rechazada correctamente'
              : 'Estado de solicitud actualizado',
        });
      }),
    );
  }

  /**
   * Saldo de vacaciones del usuario logueado
   */
  obtenerMiSaldoVacaciones(anio?: number): Observable<SaldoVacaciones> {
    let url = `${this.apiUrl}/mi-saldo-vacaciones`;
    if (anio) url += `?anio=${anio}`;
    return this.http.get<{ exitoso: boolean; data: SaldoVacaciones }>(url).pipe(map((r) => r.data));
  }

  /**
   * Saldo de vacaciones de un empleado específico (admin/líder, para revisar antes de aprobar)
   */
  obtenerSaldoVacaciones(empleadoId: number, anio?: number): Observable<SaldoVacaciones> {
    let url = `${this.apiUrl}/saldo-vacaciones/${empleadoId}`;
    if (anio) url += `?anio=${anio}`;
    return this.http.get<{ exitoso: boolean; data: SaldoVacaciones }>(url).pipe(map((r) => r.data));
  }

  /**
   * Saldo de vacaciones de todos los empleados (admin: todos; líder: su departamento)
   */
  obtenerSaldosVacacionesMasivo(anio?: number, departamentoId?: number): Observable<SaldoVacacionesEmpleado[]> {
    let url = `${this.apiUrl}/saldos-vacaciones`;
    const params: string[] = [];
    if (anio) params.push(`anio=${anio}`);
    if (departamentoId) params.push(`departamentoId=${departamentoId}`);
    if (params.length) url += `?${params.join('&')}`;
    return this.http
      .get<{ exitoso: boolean; data: SaldoVacacionesEmpleado[] }>(url)
      .pipe(map((r) => r.data || []));
  }

  /**
   * Obtener resumen de solicitudes
   */
  obtenerResumen(): Observable<any> {
    return this.http.get<{ exitoso: boolean; data: any }>(`${this.apiUrl}/resumen`)
      .pipe(
        map(response => response.data || {})
      );
  }
}
