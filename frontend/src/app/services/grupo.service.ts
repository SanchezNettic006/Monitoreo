import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface GrupoResponse {
  id: number;
  nombre: string;
  departamento: { id: number; nombre: string } | null;
  empleados: { id: number; nombre: string; apellido: string }[];
  proyectoActivo: {
    id: number;
    nombreProyecto: string;
    descripcion: string | null;
    fechaInicio: string;
  } | null;
}

export interface AsignacionProyectoResponse {
  id: number;
  grupo_id: number;
  nombre_proyecto: string;
  descripcion?: string | null;
  fecha_inicio: string;
  fecha_fin: string | null;
  creado_por_usuario_id?: number;
  created_at: string;
}

@Injectable({
  providedIn: 'root',
})
export class GrupoService {
  private apiUrl = `${environment.apiUrl}/grupos`;

  constructor(private http: HttpClient) {}

  obtenerGrupos(departamentoId?: number): Observable<{ data: GrupoResponse[] }> {
    let url = this.apiUrl;
    if (departamentoId) url += `?departamentoId=${departamentoId}`;
    return this.http.get<{ data: GrupoResponse[] }>(url);
  }

  crearGrupo(nombre: string, departamentoId: number): Observable<{ data: GrupoResponse }> {
    return this.http.post<{ data: GrupoResponse }>(this.apiUrl, { nombre, departamentoId });
  }

  asignarEmpleado(empleadoId: number, grupoId: number | null): Observable<any> {
    return this.http.patch(`${this.apiUrl}/empleados/${empleadoId}`, { grupoId });
  }

  asignarProyecto(grupoId: number, nombreProyecto: string, descripcion?: string): Observable<{ data: AsignacionProyectoResponse }> {
    return this.http.post<{ data: AsignacionProyectoResponse }>(`${this.apiUrl}/${grupoId}/proyecto`, {
      nombreProyecto,
      descripcion,
    });
  }

  obtenerHistorial(grupoId: number): Observable<{ data: AsignacionProyectoResponse[] }> {
    return this.http.get<{ data: AsignacionProyectoResponse[] }>(`${this.apiUrl}/${grupoId}/historial`);
  }

  finalizarProyecto(grupoId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${grupoId}/proyecto`);
  }
}
