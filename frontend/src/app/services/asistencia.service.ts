import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

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
  registrarEntrada(gps: GPS, foto?: File): Observable<any> {
    const formData = new FormData();
    formData.append('gps', JSON.stringify(gps));
    if (foto) {
      formData.append('foto', foto);
    }

    return this.http.post(`${this.apiUrl}/entrada`, formData);
  }

  /**
   * Registrar salida (check-out)
   */
  registrarSalida(gps: GPS, foto?: File): Observable<any> {
    const formData = new FormData();
    formData.append('gps', JSON.stringify(gps));
    if (foto) {
      formData.append('foto', foto);
    }

    return this.http.post(`${this.apiUrl}/salida`, formData);
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
   * Obtener ubicación GPS actual
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
        }
      );
    });
  }
}
