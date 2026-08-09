import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Empleado {
  id: number;
  nombre: string;
  apellido: string;
  cargo?: string;
  telefono?: string;
  foto_perfil?: string;
  estado?: string;
  usuario_id: number;
  departamento_id: number;
  usuario?: {
    id: number;
    email: string;
    rol: string;
  };
  departamento?: {
    id: number;
    nombre: string;
    descripcion: string;
  };
}

export interface EmpleadoResponse {
  mensaje: string;
  data: Empleado | Empleado[];
  credenciales?: {
    email: string;
    password: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class EmpleadoService {
  private apiUrl = `${environment.apiUrl}/empleados`;

  constructor(private http: HttpClient) {}

  /**
   * Obtener todos los empleados
   */
  obtenerTodos(): Observable<EmpleadoResponse> {
    return this.http.get<EmpleadoResponse>(this.apiUrl);
  }

  /**
   * Obtener un empleado por ID
   */
  obtenerPorId(id: number): Observable<EmpleadoResponse> {
    return this.http.get<EmpleadoResponse>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crear un nuevo empleado
   */
  crear(datos: Partial<Empleado>): Observable<EmpleadoResponse> {
    return this.http.post<EmpleadoResponse>(this.apiUrl, datos);
  }

  /**
   * Actualizar un empleado
   */
  actualizar(id: number, datos: Partial<Empleado>): Observable<EmpleadoResponse> {
    return this.http.put<EmpleadoResponse>(`${this.apiUrl}/${id}`, datos);
  }

  /**
   * Eliminar un empleado
   */
  eliminar(id: number): Observable<EmpleadoResponse> {
    return this.http.delete<EmpleadoResponse>(`${this.apiUrl}/${id}`);
  }

  /**
   * Subir foto de perfil
   */
  subirFoto(id: number, archivo: File): Observable<EmpleadoResponse> {
    const formData = new FormData();
    formData.append('foto', archivo);
    return this.http.post<EmpleadoResponse>(`${this.apiUrl}/${id}/foto`, formData);
  }
}
