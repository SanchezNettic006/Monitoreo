import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { AsistenciaService, GPS } from './asistencia.service';
import { HoraExtraService } from './hora-extra.service';
import { ConexionService } from './conexion.service';

export type TipoAccionPendiente = 'checkin' | 'checkout' | 'iniciar_hora_extra' | 'finalizar_hora_extra';

export interface AccionPendiente {
  id: string;
  tipo: TipoAccionPendiente;
  /** Momento real en que el técnico capturó la foto/GPS, no cuando se sincroniza. */
  capturadoEn: string;
  gps: GPS | null;
  foto: Blob;
  fotoNombre: string;
  numeroTicket?: string;
  tipoTrabajo?: 'instalacion' | 'averia' | 'motivo';
  recordAsistenciaId?: number;
  horaExtraId?: number;
  intentos: number;
  ultimoError?: string;
}

export interface AccionSincronizada {
  accion: AccionPendiente;
  resultado: any;
}

const DB_NAME = 'nettic-cola-offline';
const STORE_NAME = 'acciones_pendientes';
const DB_VERSION = 1;

/**
 * Cola de acciones de asistencia/hora-extra capturadas sin señal.
 * GPS y foto no requieren datos móviles, así que se capturan igual;
 * solo el envío al backend necesita conexión. Esta cola guarda la
 * acción completa en IndexedDB y la reintenta automáticamente en
 * cuanto el navegador detecta conexión de nuevo.
 */
@Injectable({
  providedIn: 'root',
})
export class ColaOfflineService {
  private dbPromise: Promise<IDBDatabase>;
  private pendientesSubject = new BehaviorSubject<AccionPendiente[]>([]);
  pendientes$ = this.pendientesSubject.asObservable();

  private sincronizandoSubject = new BehaviorSubject<boolean>(false);
  sincronizando$ = this.sincronizandoSubject.asObservable();

  private accionSincronizada = new Subject<AccionSincronizada>();
  accionSincronizada$ = this.accionSincronizada.asObservable();

  constructor(
    private asistenciaService: AsistenciaService,
    private horaExtraService: HoraExtraService,
    private conexionService: ConexionService,
    private ngZone: NgZone,
  ) {
    this.dbPromise = this.abrirDb();
    this.ngZone.run(() => this.refrescarPendientes());

    this.conexionService.enLinea$.subscribe((enLinea) => {
      if (enLinea) {
        this.sincronizarPendientes();
      }
    });
  }

  private abrirDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async obtenerTodas(): Promise<AccionPendiente[]> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  private async guardar(accion: AccionPendiente): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(accion);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private async eliminar(id: string): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private async refrescarPendientes(): Promise<void> {
    const todas = await this.obtenerTodas();
    this.pendientesSubject.next(todas);
  }

  get cantidadPendientes(): number {
    return this.pendientesSubject.value.length;
  }

  /** Encola una acción para envío inmediato o posterior según haya señal. */
  encolar(datos: Omit<AccionPendiente, 'id' | 'intentos'>): Promise<void> {
    // IndexedDB no lo rastrea zone.js: sin este ngZone.run(), Angular no se
    // entera de los cambios que produce esta cadena (await guardar/refrescar)
    // y la pantalla se queda con datos viejos hasta el próximo clic.
    return this.ngZone.run(async () => {
      const accion: AccionPendiente = {
        ...datos,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        intentos: 0,
      };
      await this.guardar(accion);
      await this.refrescarPendientes();
      if (this.conexionService.enLinea) {
        this.sincronizarPendientes();
      }
    });
  }

  /** Intenta enviar todas las acciones pendientes, en orden, al backend. */
  sincronizarPendientes(): Promise<void> {
    // Ídem: forzamos que toda la cadena async (incluye IndexedDB) quede
    // dentro de la zona de Angular, para que la UI se actualice sola.
    return this.ngZone.run(() => this.ejecutarSincronizacion());
  }

  private async ejecutarSincronizacion(): Promise<void> {
    if (this.sincronizandoSubject.value) return;
    if (!this.conexionService.enLinea) return;

    const pendientes = await this.obtenerTodas();
    if (pendientes.length === 0) return;

    this.sincronizandoSubject.next(true);
    try {
      for (const accion of pendientes.sort((a, b) => a.capturadoEn.localeCompare(b.capturadoEn))) {
        if (!this.conexionService.enLinea) break;
        try {
          const resultado = await this.enviarAccion(accion);
          await this.eliminar(accion.id);
          await this.refrescarPendientes();
          this.accionSincronizada.next({ accion, resultado });
        } catch (error: any) {
          // status 0 = sin conexión real (no llegó al servidor); dejamos de intentar por ahora.
          if (error?.status === 0) {
            break;
          }
          // Error del servidor (ej. validación): tras varios intentos fallidos
          // la acción ya no es válida (ej. datos de un turno que ya cambió),
          // se descarta para no reintentar por siempre en cada carga de la página.
          accion.intentos += 1;
          accion.ultimoError = error?.error?.mensaje || error?.message || 'Error desconocido';
          if (accion.intentos >= 3) {
            await this.eliminar(accion.id);
          } else {
            await this.guardar(accion);
          }
          await this.refrescarPendientes();
        }
      }
    } finally {
      this.sincronizandoSubject.next(false);
    }
  }

  private enviarAccion(accion: AccionPendiente): Promise<any> {
    const foto = new File([accion.foto], accion.fotoNombre, { type: accion.foto.type });

    switch (accion.tipo) {
      case 'checkin':
        return this.asistenciaService
          .registrarEntrada(accion.gps, foto, accion.capturadoEn)
          .toPromise();
      case 'checkout':
        return this.asistenciaService
          .registrarSalida(accion.gps, foto, accion.capturadoEn)
          .toPromise();
      case 'iniciar_hora_extra':
        return accion.recordAsistenciaId
          ? this.horaExtraService
              .iniciarHoraExtra(
                accion.recordAsistenciaId,
                accion.numeroTicket!,
                accion.gps?.latitud ?? null,
                accion.gps?.longitud ?? null,
                foto,
                accion.capturadoEn,
                accion.tipoTrabajo,
              )
              .toPromise()
          : this.horaExtraService
              .iniciarHoraExtraDirecta(
                accion.numeroTicket!,
                accion.gps?.latitud ?? null,
                accion.gps?.longitud ?? null,
                foto,
                accion.capturadoEn,
                accion.tipoTrabajo,
              )
              .toPromise();
      case 'finalizar_hora_extra':
        return this.horaExtraService
          .finalizarHoraExtra(
            accion.horaExtraId!,
            accion.gps?.latitud ?? null,
            accion.gps?.longitud ?? null,
            foto,
            accion.capturadoEn,
          )
          .toPromise();
    }
  }

  /** Descarta una acción pendiente que ya no aplica (ej. el usuario decide cancelarla). */
  async descartar(id: string): Promise<void> {
    await this.eliminar(id);
    await this.refrescarPendientes();
  }
}
