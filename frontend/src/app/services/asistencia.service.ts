import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PausaAsistencia, PausasResponse } from '../models/pausa.model';

export interface GPS {
  latitud: number;
  longitud: number;
}

export interface RecordAsistencia {
  id: number;
  fecha: Date;
  hora_entrada: string;
  hora_salida?: string;
  ubicacion_entrada: string;
  ubicacion_salida?: string;
  horas_trabajadas?: number;
  horas_extras?: number;
  estado: string;
  fotos?: { id: number; tipo: string; url_foto: string }[];
}

export interface ResumenAsistencia {
  periodo: string;
  totalDias: number;
  totalHoras: string;
  totalExtras: string;
  registros: RecordAsistencia[];
}

@Injectable({
  providedIn: 'root',
})
export class AsistenciaService {
  private apiUrl = `${environment.apiUrl}/asistencia`;

  constructor(private http: HttpClient) {}

  /**
   * Registrar entrada (check-in)
   */
  registrarEntrada(gps: GPS | null, foto?: File, capturadoEn?: string): Observable<any> {
    const formData = new FormData();
    if (gps) {
      formData.append('gps', JSON.stringify(gps));
    }
    if (foto) {
      formData.append('foto', foto);
    }
    if (capturadoEn) {
      formData.append('capturadoEn', capturadoEn);
    }

    return this.http.post(`${this.apiUrl}/entrada`, formData);
  }

  /**
   * Registrar salida (check-out)
   */
  registrarSalida(gps: GPS | null, foto?: File, capturadoEn?: string): Observable<any> {
    const formData = new FormData();
    if (gps) {
      formData.append('gps', JSON.stringify(gps));
    }
    if (foto) {
      formData.append('foto', foto);
    }
    if (capturadoEn) {
      formData.append('capturadoEn', capturadoEn);
    }

    return this.http.post(`${this.apiUrl}/salida`, formData);
  }

  /**
   * Enviar reporte de cierre (descripción + fotos del trabajo realizado),
   * exigido a departamentos con requiere_reporte_cierre (p. ej. Taller)
   */
  enviarReporteCierre(recordId: number, descripcion: string, fotos: File[], proyectoTrabajado?: string): Observable<any> {
    const formData = new FormData();
    formData.append('recordId', String(recordId));
    formData.append('descripcion', descripcion);
    if (proyectoTrabajado) {
      formData.append('proyectoTrabajado', proyectoTrabajado);
    }
    fotos.forEach((foto) => formData.append('fotos', foto));

    return this.http.post(`${this.apiUrl}/reporte-cierre`, formData);
  }

  obtenerMisProyectos(): Observable<any> {
    return this.http.get(`${this.apiUrl}/mis-proyectos`);
  }

  /**
   * Obtener registro de hoy
   */
  obtenerRegistroHoy(): Observable<any> {
    return this.http.get(`${this.apiUrl}/hoy`);
  }

  /**
   * Obtener resumen de asistencia
   */
  obtenerResumen(): Observable<ResumenAsistencia> {
    return this.http.get<ResumenAsistencia>(`${this.apiUrl}/resumen`);
  }

  /**
   * Obtener todos los registros del empleado
   */
  obtenerRegistros(): Observable<RecordAsistencia[]> {
    return this.http.get<RecordAsistencia[]>(`${this.apiUrl}/registros`);
  }

  /**
   * Obtener ubicación GPS actual.
   * `timeout`: no esperar más de 15s (evita bloquear el check-in indefinidamente
   * si el dispositivo tarda en conseguir un fix, común en interiores/campo).
   * `maximumAge`: acepta una posición ya conocida de hasta 10 minutos, para no
   * forzar un fix nuevo cuando ya hay una ubicación reciente en caché.
   */
  obtenerGPS(): Promise<GPS> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject('Geolocation no soportado en este navegador');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitud: position.coords.latitude,
            longitud: position.coords.longitude,
          });
        },
        (error) => {
          reject(`Error al obtener GPS: ${error.message}`);
        },
        { timeout: 15000, maximumAge: 10 * 60 * 1000, enableHighAccuracy: true },
      );
    });
  }

  /**
   * Iniciar pausa
   */
  iniciarPausa(recordId: number, tipoPausa: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/pausa/iniciar`, {
      recordId,
      tipoPausa,
    });
  }

  /**
   * Finalizar pausa
   */
  finalizarPausa(recordId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/pausa/finalizar`, {
      recordId,
    });
  }

  /**
   * Obtener pausas de un registro
   */
  obtenerPausas(recordId: number): Observable<PausasResponse> {
    return this.http.get<PausasResponse>(`${this.apiUrl}/${recordId}/pausas`);
  }
}
