import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface HoraExtraResponse {
  id: number;
  record_asistencia_id: number;
  numero_ticket: string;
  tipo_trabajo: 'instalacion' | 'averia';
  hora_inicio: string;
  hora_fin: string | null;
  duracion: number | null;
  latitud_inicio: number;
  longitud_inicio: number;
  latitud_fin: number | null;
  longitud_fin: number | null;
  estado: 'iniciada' | 'finalizada';
  created_at: string;
  updated_at: string;
  // Revisión del admin sobre las horas reportadas
  estado_aprobacion: 'pendiente' | 'aprobada' | 'rechazada';
  horas_aprobadas: number | null;
  motivo_ajuste: string | null;
  aprobador_id?: number;
  fecha_aprobacion: string | null;
  // Datos relacionados (del backend via JOIN)
  empleado_nombre?: string;
  empleado_apellido?: string;
  empleado_nombre_completo?: string;
  departamento_nombre?: string;
  fotos?: { id: number; tipo: string; url_foto: string }[];
}

export interface IniciarHoraExtraResponse {
  status: string;
  message: string;
  data: HoraExtraResponse;
}

export interface FinalizarHoraExtraResponse {
  status: string;
  message: string;
  data: HoraExtraResponse;
}

export interface ObtenerActivasResponse {
  status: string;
  message: string;
  data: HoraExtraResponse[];
}

export interface ObtenerHistorialResponse {
  status: string;
  message: string;
  data: HoraExtraResponse[];
}

@Injectable({
  providedIn: 'root'
})
export class HoraExtraService {
  private apiUrl = `${environment.apiUrl}/asistencia/hora-extra`;

  constructor(private http: HttpClient) { }

  /**
   * Iniciar una hora extra con número de ticket y GPS
   */
  iniciarHoraExtra(
    recordAsistenciaId: number,
    numeroTicket: string,
    latitud: number | null,
    longitud: number | null,
    foto?: File,
    capturadoEn?: string,
    tipoTrabajo: 'instalacion' | 'averia' = 'instalacion',
  ): Observable<IniciarHoraExtraResponse> {
    const formData = new FormData();
    formData.append('recordAsistenciaId', recordAsistenciaId.toString());
    formData.append('numeroTicket', numeroTicket);
    formData.append('tipoTrabajo', tipoTrabajo);
    if (latitud !== null && longitud !== null) {
      formData.append('latitud', latitud.toString());
      formData.append('longitud', longitud.toString());
    }

    if (foto) {
      formData.append('foto', foto, foto.name);
    }
    if (capturadoEn) {
      formData.append('capturadoEn', capturadoEn);
    }

    return this.http.post<IniciarHoraExtraResponse>(`${this.apiUrl}/iniciar`, formData);
  }

  /**
   * Iniciar una hora extra directa (sin recordAsistenciaId previo)
   * El backend creará el recordAsistenciaId automáticamente usando el usuarioId del token JWT
   * Útil para horas extras en días especiales (domingos, emergencias, etc)
   */
  iniciarHoraExtraDirecta(
    numeroTicket: string,
    latitud: number | null,
    longitud: number | null,
    foto?: File,
    capturadoEn?: string,
    tipoTrabajo: 'instalacion' | 'averia' = 'instalacion',
  ): Observable<IniciarHoraExtraResponse> {
    const formData = new FormData();
    formData.append('numeroTicket', numeroTicket);
    formData.append('tipoTrabajo', tipoTrabajo);
    if (latitud !== null && longitud !== null) {
      formData.append('latitud', latitud.toString());
      formData.append('longitud', longitud.toString());
    }

    if (foto) {
      formData.append('foto', foto, foto.name);
    }
    if (capturadoEn) {
      formData.append('capturadoEn', capturadoEn);
    }

    return this.http.post<IniciarHoraExtraResponse>(`${this.apiUrl}/iniciar`, formData);
  }

  /**
   * Finalizar una hora extra con GPS
   */
  finalizarHoraExtra(
    horaExtraId: number,
    latitud: number | null,
    longitud: number | null,
    foto?: File,
    capturadoEn?: string
  ): Observable<FinalizarHoraExtraResponse> {
    const formData = new FormData();
    formData.append('horaExtraId', horaExtraId.toString());
    if (latitud !== null && longitud !== null) {
      formData.append('latitud', latitud.toString());
      formData.append('longitud', longitud.toString());
    }

    if (foto) {
      formData.append('foto', foto, foto.name);
    }
    if (capturadoEn) {
      formData.append('capturadoEn', capturadoEn);
    }

    return this.http.post<FinalizarHoraExtraResponse>(`${this.apiUrl}/finalizar`, formData);
  }

  /**
   * Obtener horas extras activas (estado = iniciada)
   */
  obtenerHorasExtrasActivas(recordAsistenciaId: number): Observable<ObtenerActivasResponse> {
    return this.http.get<ObtenerActivasResponse>(`${this.apiUrl}/activas/${recordAsistenciaId}`);
  }

  /**
   * Obtener historial de horas extras (todas las de un registro)
   */
  obtenerHistorial(recordAsistenciaId: number): Observable<ObtenerHistorialResponse> {
    return this.http.get<ObtenerHistorialResponse>(`${this.apiUrl}/historial/${recordAsistenciaId}`);
  }

  /**
   * Obtener la hora extra activa del usuario actual
   */
  obtenerMiHoraExtraActiva(): Observable<IniciarHoraExtraResponse> {
    return this.http.get<IniciarHoraExtraResponse>(`${this.apiUrl}/mi-activa`);
  }

  /**
   * Obtener todas las horas extras (admin: todas; líder: solo su departamento)
   */
  obtenerTodasHorasExtras(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/todas`);
  }

  /**
   * Obtener las horas extras del usuario logueado
   */
  obtenerMisHorasExtras(): Observable<{ exitoso: boolean; data: HoraExtraResponse[] }> {
    return this.http.get<{ exitoso: boolean; data: HoraExtraResponse[] }>(`${this.apiUrl}/mis-horas-extra`);
  }

  /**
   * Aprobar (total o parcial) o rechazar las horas de un ticket finalizado
   */
  revisarHoraExtra(
    horaExtraId: number,
    horasAprobadas: number,
    motivo?: string,
  ): Observable<{ exitoso: boolean; data: HoraExtraResponse }> {
    return this.http.patch<{ exitoso: boolean; data: HoraExtraResponse }>(
      `${this.apiUrl}/${horaExtraId}/revisar`,
      { horas_aprobadas: horasAprobadas, motivo },
    );
  }
}
