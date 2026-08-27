import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type TipoDiaCalendario = 'festivo' | 'no_laborable';

export interface DiaCalendario {
  id: number;
  fecha: string;
  tipo: TipoDiaCalendario;
  nombre: string;
  created_at: string;
  empleadosExceptuados?: { id: number; nombre: string; apellido: string }[];
}

export interface EventoProximo {
  fecha: string;
  tipo: string;
  titulo: string;
}

@Injectable({
  providedIn: 'root'
})
export class CalendarioService {
  private apiUrl = `${environment.apiUrl}/calendario`;

  constructor(private http: HttpClient) {}

  listarPorAnio(anio: number): Observable<{ mensaje: string; data: DiaCalendario[] }> {
    return this.http.get<{ mensaje: string; data: DiaCalendario[] }>(this.apiUrl, {
      params: { anio: anio.toString() }
    });
  }

  crear(
    fecha: string,
    tipo: TipoDiaCalendario,
    nombre: string,
    empleadosExceptuadosIds?: number[],
  ): Observable<{ mensaje: string; data: DiaCalendario }> {
    return this.http.post<{ mensaje: string; data: DiaCalendario }>(this.apiUrl, {
      fecha,
      tipo,
      nombre,
      empleadosExceptuadosIds,
    });
  }

  eliminar(id: number): Observable<{ mensaje: string; data: { id: number } }> {
    return this.http.delete<{ mensaje: string; data: { id: number } }>(`${this.apiUrl}/${id}`);
  }

  obtenerProximosEventos(limite: number = 10): Observable<{ mensaje: string; data: EventoProximo[] }> {
    return this.http.get<{ mensaje: string; data: EventoProximo[] }>(`${this.apiUrl}/proximos-eventos`, {
      params: { limite: limite.toString() }
    });
  }
}
