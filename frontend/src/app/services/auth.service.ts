import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface LoginRequest {
  email: string;
  password_hash: string;
}

export interface LoginResponse {
  token: string;
  usuario: Usuario;
}

export interface Usuario {
  id: number;
  email: string;
  username?: string;
  rol: string;
  foto_perfil?: string;
  nombre?: string;
  apellido?: string;
  cargo?: string;
  telefono?: string;
  departamento?: string;
  /** false solo en departamentos que no trabajan con tickets/NET (ej. Vehículos y Taller) */
  usaTicketHorasExtra?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private currentUserSubject = new BehaviorSubject<Usuario | null>(this.getUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  login(email: string, password_hash: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, {
      email,
      password_hash
    }).pipe(
      tap(response => {
        localStorage.setItem('token', response.token);
        localStorage.setItem('usuario', JSON.stringify(response.usuario));
        this.currentUserSubject.next(response.usuario);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    this.currentUserSubject.next(null);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  private getUserFromStorage(): Usuario | null {
    try {
      const user = localStorage.getItem('usuario');
      return user && user !== 'undefined' ? JSON.parse(user) : null;
    } catch (error) {
      console.error('Error parsing user from storage:', error);
      localStorage.removeItem('usuario');
      return null;
    }
  }

  getCurrentUser(): Usuario | null {
    return this.currentUserSubject.value;
  }

  esAdmin(): boolean {
    return this.currentUserSubject.value?.rol === 'admin';
  }

  esLider(): boolean {
    return this.currentUserSubject.value?.rol === 'lider';
  }

  /**
   * Actualiza la foto de perfil del usuario logueado en memoria y localStorage
   */
  actualizarFotoPerfil(fotoUrl: string): void {
    const usuarioActual = this.currentUserSubject.value;
    if (!usuarioActual) return;

    const usuarioActualizado = { ...usuarioActual, foto_perfil: fotoUrl };
    localStorage.setItem('usuario', JSON.stringify(usuarioActualizado));
    this.currentUserSubject.next(usuarioActualizado);
  }

  /**
   * Sube una foto nueva como foto de perfil propia (funciona sin tener Empleado, ej. admin)
   */
  subirFotoPropia(archivo: File): Observable<{ mensaje: string; data: Usuario }> {
    const formData = new FormData();
    formData.append('foto', archivo);
    return this.http.post<{ mensaje: string; data: Usuario }>(`${this.apiUrl}/perfil/foto`, formData).pipe(
      tap((response) => this.actualizarFotoPerfil(response.data.foto_perfil || '')),
    );
  }

  /**
   * Obtiene el perfil completo (nombre, cargo, departamento, etc.) del usuario logueado
   */
  obtenerPerfil(): Observable<{ data: Usuario }> {
    return this.http.get<{ data: Usuario }>(`${this.apiUrl}/perfil`);
  }
}
