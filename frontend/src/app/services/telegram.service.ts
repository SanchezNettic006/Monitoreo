import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface EstadoTelegram {
  vinculado: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class TelegramService {
  private apiUrl = `${environment.apiUrl}/telegram`;

  constructor(private http: HttpClient) {}

  obtenerEstado(): Observable<EstadoTelegram> {
    return this.http
      .get<{ exitoso: boolean; data: EstadoTelegram }>(`${this.apiUrl}/estado`)
      .pipe(map((r) => r.data));
  }

  generarVinculo(): Observable<string> {
    return this.http
      .get<{ exitoso: boolean; data: { url: string } }>(`${this.apiUrl}/vincular`)
      .pipe(map((r) => r.data.url));
  }

  desvincular(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/desvincular`, {});
  }
}
