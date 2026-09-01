import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { AsistenciaService, GPS, RecordAsistencia } from '../../services/asistencia.service';
import { HoraExtraService, HoraExtraResponse } from '../../services/hora-extra.service';
import { PausaAsistencia, PausasResponse } from '../../models/pausa.model';
import { Router } from '@angular/router';
import { ReporteCierreDialogComponent } from './reporte-cierre-dialog/reporte-cierre-dialog.component';
import { ConexionService } from '../../services/conexion.service';
import { ColaOfflineService } from '../../services/cola-offline.service';

@Component({
  selector: 'app-registro-asistencia',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatMenuModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
  templateUrl: './registro-asistencia.component.html',
  styleUrl: './registro-asistencia.component.scss',
})
export class RegistroAsistenciaComponent implements OnInit, OnDestroy {
  @ViewChild('swipeTrack') swipeTrack?: ElementRef<HTMLDivElement>;

  /** Página visible del carrusel (Asistencia / Horas Extra) */
  tabActiva: 'asistencia' | 'horaExtra' = 'asistencia';

  cargando = false;
  registroHoy: RecordAsistencia | null = null;
  estado: 'sin_registro' | 'activo' | 'finalizado' = 'sin_registro';
  gpsActual: GPS | null = null;
  
  // Fotos de asistencia
  fotoCapturadaAsistencia: File | null = null;
  previewFotoAsistencia: string | null = null;

  // Pausas
  pausas: PausaAsistencia[] = [];
  pausaActiva: PausaAsistencia | null = null;
  totalPausas = 0;
  tiposPausa = ['desayuno', 'comida', 'medico', 'personal'];

  // Cronómetro en vivo
  tiempoTranscurrido = '00:00:00';
  intervalId: any = null;

  // Horas extras
  horaExtraActiva: HoraExtraResponse | null = null;
  tiempoHoraExtra = '00:00:00';
  intervalIdHoraExtra: any = null;
  numeroTicket = '';
  tipoTrabajo: 'instalacion' | 'averia' = 'instalacion';
  mostrarFormHoraExtra = false;
  
  // Fotos de horas extras
  fotoCapturadaHoraExtra: File | null = null;
  previewFotoHoraExtra: string | null = null;

  constructor(
    private asistenciaService: AsistenciaService,
    private horaExtraService: HoraExtraService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router,
    private conexionService: ConexionService,
    private colaOfflineService: ColaOfflineService,
  ) {}

  ngOnInit(): void {
    // Restaurar foto capturada del localStorage si existe (solo asistencia)
    const previewGuardado = localStorage.getItem('previewFoto');
    if (previewGuardado) {
      this.previewFotoAsistencia = previewGuardado;
    }

    // Cargar hora extra PRIMERO (como Promise)
    // Luego cargar asistencia (verifica si hay hora extra activa)
    this.cargarHoraExtraActivaPromise().finally(() => {
      // Usar finally para asegurar que se ejecute incluso si hay error
      this.cargarRegistroHoy();
    });

    // Cuando una acción encolada offline (check-in/out, hora extra) se sincroniza
    // de verdad con el backend, refrescamos el estado con la respuesta real del servidor.
    this.colaOfflineService.accionSincronizada$.subscribe(({ accion, resultado }) => {
      if (accion.tipo === 'checkin' || accion.tipo === 'checkout') {
        this.cargarRegistroHoy();
      } else {
        this.cargarHoraExtraActivaPromise();
      }
      this.snackBar.open('✅ Registro pendiente sincronizado correctamente', 'Cerrar', { duration: 3000 });
    });
  }

  /**
   * Cargar registro de asistencia de hoy
   */
  cargarRegistroHoy(): void {
    this.cargando = true;
    this.asistenciaService.obtenerRegistroHoy().subscribe({
      next: (response: any) => {
        this.registroHoy = response.record;
        this.estado = response.estado;
        
        // Si hay registro activo, cargar pausas e iniciar cronómetro
        // PERO SOLO si:
        // 1. NO hay hora extra activa (hora extra tiene prioridad)
        // 2. Tiene una hora_entrada válida (no fue creado automáticamente por hora extra)
        if (this.registroHoy && this.estado === 'activo') {
          this.cargarPausas();
          
          if (!this.horaExtraActiva && this.registroHoy.hora_entrada) {
            // Solo iniciar cronómetro si tiene hora_entrada (check-in manual o previo)
            this.iniciarCronometro();
          }
        }
        
        // Si hay registro activo sin completar, mostrar alerta
        if (this.estado === 'activo') {
          this.snackBar.open(
            'ℹ️ Tienes un registro activo. Complétalo con CHECK-OUT',
            'OK',
            { duration: 5000 }
          );
        }
        
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar registro:', error);
        this.snackBar.open('Error al cargar registro', 'Cerrar', {
          duration: 3000,
        });
        this.cargando = false;
      },
    });
  }

  /**
   * Cargar pausas del registro actual
   */
  cargarPausas(): void {
    if (!this.registroHoy?.id) return;

    this.asistenciaService.obtenerPausas(this.registroHoy.id).subscribe({
      next: (response: PausasResponse) => {
        this.pausas = response.pausas;
        this.totalPausas = parseFloat(response.total);
        
        // Identificar pausa activa
        this.pausaActiva = this.pausas.find(p => p.estado === 'pausa_activa') || null;
      },
      error: (error) => {
        console.error('Error al cargar pausas:', error);
      },
    });
  }

  /**
   * Obtener GPS actual. El servicio ya limita la espera a 15s (ver obtenerGPS()
   * en asistencia.service.ts); si falla o se agota el tiempo, en vez de bloquear
   * el check-in indefinidamente, se ofrece continuar sin ubicación.
   */
  async obtenerGPS(): Promise<GPS | null> {
    try {
      this.gpsActual = await this.asistenciaService.obtenerGPS();
      this.snackBar.open('✅ GPS obtenido', 'Cerrar', { duration: 2000 });
      return this.gpsActual;
    } catch (error) {
      return this.ofrecerContinuarSinGPS();
    }
  }

  /**
   * Muestra "Continuar sin GPS": si el técnico lo presiona, avanza de inmediato;
   * si no lo presiona, avanza igual pasados unos segundos para no dejarlo bloqueado.
   * En ambos casos el check-in/hora-extra se registra con ubicación nula.
   */
  private ofrecerContinuarSinGPS(): Promise<GPS | null> {
    return new Promise((resolve) => {
      const ref = this.snackBar.open(
        '📍 No se pudo obtener tu ubicación GPS a tiempo.',
        'Continuar sin GPS',
        { duration: 8000 },
      );
      let resuelto = false;
      ref.onAction().subscribe(() => {
        resuelto = true;
        resolve(null);
      });
      ref.afterDismissed().subscribe(() => {
        if (!resuelto) {
          resuelto = true;
          resolve(null);
        }
      });
    });
  }

  /**
   * Capturar foto con webcam
   */
  capturarFoto(tipo: 'asistencia' | 'horaExtra' = 'asistencia'): void {
    // Crear input de video para captura de webcam
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Pedir permiso para acceder a la cámara
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          video.play();
          // Esperar 1 segundo para que la imagen sea clara
          setTimeout(() => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx?.drawImage(video, 0, 0);

            // Convertir canvas a blob y luego a File
            canvas.toBlob((blob) => {
              if (blob) {
                const fotoFile = new File(
                  [blob],
                  `foto_${tipo}_${Date.now()}.jpg`,
                  {
                    type: 'image/jpeg',
                  }
                );

                // Mostrar preview y guardar en localStorage
                const reader = new FileReader();
                reader.onload = (e: any) => {
                  if (tipo === 'asistencia') {
                    this.fotoCapturadaAsistencia = fotoFile;
                    this.previewFotoAsistencia = e.target.result;
                    if (this.previewFotoAsistencia) {
                      localStorage.setItem('previewFoto', this.previewFotoAsistencia);
                    }
                  } else {
                    this.fotoCapturadaHoraExtra = fotoFile;
                    this.previewFotoHoraExtra = e.target.result;
                  }
                };
                reader.readAsDataURL(blob);

                this.snackBar.open('✅ Foto capturada', 'Cerrar', {
                  duration: 2000,
                });
              }

              // Detener stream
              stream.getTracks().forEach((track) => track.stop());
            });
          }, 1000);
        };
      })
      .catch((error) => {
        this.snackBar.open(`Error de cámara: ${error.message}`, 'Cerrar', {
          duration: 3000,
        });
      });
  }

  /**
   * Realizar CHECK-IN
   */
  async realizarCheckIn(): Promise<void> {
    // Validar que existe foto
    if (!this.fotoCapturadaAsistencia) {
      this.snackBar.open('❌ Debes capturar una foto antes de hacer CHECK-IN', 'Cerrar', {
        duration: 3000,
      });
      return;
    }

    try {
      this.cargando = true;

      // El GPS es del dispositivo (no requiere señal de datos), así que se obtiene igual sin conexión
      const gps = await this.obtenerGPS();
      const foto = this.fotoCapturadaAsistencia!;
      const capturadoEn = new Date().toISOString();

      if (!this.conexionService.enLinea) {
        await this.colaOfflineService.encolar({
          tipo: 'checkin',
          capturadoEn,
          gps,
          foto,
          fotoNombre: foto.name,
        });
        this.confirmarGuardadoOffline('Entrada');
        this.limpiarFoto('asistencia');
        this.cargando = false;
        return;
      }

      // Registrar entrada
      this.asistenciaService
        .registrarEntrada(gps, foto, capturadoEn)
        .subscribe({
          next: (response: any) => {
            this.registroHoy = response.record;
            this.estado = 'activo';
            this.limpiarFoto('asistencia');
            this.iniciarCronometro();

            this.snackBar.open(response.mensaje, 'Cerrar', { duration: 3000 });
            this.cargando = false;
          },
          error: async (error) => {
            if (error.status === 0) {
              await this.colaOfflineService.encolar({
                tipo: 'checkin',
                capturadoEn,
                gps,
                foto,
                fotoNombre: foto.name,
              });
              this.confirmarGuardadoOffline('Entrada');
              this.limpiarFoto('asistencia');
              this.cargando = false;
              return;
            }
            const mensaje =
              error.error?.mensaje || 'Error al registrar entrada';
            this.snackBar.open(mensaje, 'Cerrar', { duration: 3000 });
            this.cargando = false;
          },
        });
    } catch (error) {
      this.snackBar.open(`Error: ${error}`, 'Cerrar', { duration: 3000 });
      this.cargando = false;
    }
  }

  /** Aviso consistente cuando una acción quedó guardada localmente por falta de señal. */
  private confirmarGuardadoOffline(accion: string): void {
    this.snackBar.open(
      `📥 Sin conexión: ${accion} guardada. Se enviará automáticamente cuando vuelva la señal.`,
      'Cerrar',
      { duration: 5000 },
    );
  }

  /**
   * Realizar CHECK-OUT
   */
  async realizarCheckOut(): Promise<void> {
    // Validar que existe foto
    if (!this.fotoCapturadaAsistencia) {
      this.snackBar.open('❌ Debes capturar una foto antes de hacer CHECK-OUT', 'Cerrar', {
        duration: 3000,
      });
      return;
    }

    try {
      this.cargando = true;

      // El GPS es del dispositivo (no requiere señal de datos), así que se obtiene igual sin conexión
      const gps = await this.obtenerGPS();
      const foto = this.fotoCapturadaAsistencia!;
      const capturadoEn = new Date().toISOString();

      if (!this.conexionService.enLinea) {
        await this.colaOfflineService.encolar({
          tipo: 'checkout',
          capturadoEn,
          gps,
          foto,
          fotoNombre: foto.name,
        });
        this.confirmarGuardadoOffline('Salida');
        this.limpiarFoto('asistencia');
        this.cargando = false;
        return;
      }

      // Registrar salida
      this.asistenciaService
        .registrarSalida(gps, foto, capturadoEn)
        .subscribe({
          next: (response: any) => {
            this.registroHoy = response.record;
            this.estado = 'finalizado';
            this.limpiarFoto('asistencia');
            if (this.intervalId) {
              clearInterval(this.intervalId);
              this.intervalId = null;
            }

            // Cargar pausas del registro completado
            if (this.registroHoy?.id) {
              this.cargarPausas();
            }

            this.snackBar.open(response.mensaje, 'Cerrar', { duration: 3000 });
            this.cargando = false;

            if (response.requiereReporteCierre && this.registroHoy?.id) {
              this.abrirReporteCierre(this.registroHoy.id);
            }
          },
          error: async (error) => {
            if (error.status === 0) {
              await this.colaOfflineService.encolar({
                tipo: 'checkout',
                capturadoEn,
                gps,
                foto,
                fotoNombre: foto.name,
              });
              this.confirmarGuardadoOffline('Salida');
              this.limpiarFoto('asistencia');
              this.cargando = false;
              return;
            }
            const mensaje = error.error?.mensaje || 'Error al registrar salida';
            this.snackBar.open(mensaje, 'Cerrar', { duration: 3000 });
            this.cargando = false;
          },
        });
    } catch (error) {
      this.snackBar.open(`Error: ${error}`, 'Cerrar', { duration: 3000 });
      this.cargando = false;
    }
  }

  /**
   * Iniciar pausa
   */
  iniciarPausa(tipo: string): void {
    if (!this.registroHoy?.id) return;

    this.cargando = true;
    this.asistenciaService.iniciarPausa(this.registroHoy.id, tipo).subscribe({
      next: (response: any) => {
        this.pausaActiva = response.pausa;
        this.pausas.push(response.pausa);
        this.snackBar.open(`✅ Pausa ${tipo} iniciada`, 'Cerrar', { duration: 2000 });
        this.cargando = false;
      },
      error: (error) => {
        const mensaje = error.error?.mensaje || 'Error al iniciar pausa';
        this.snackBar.open(mensaje, 'Cerrar', { duration: 3000 });
        this.cargando = false;
      },
    });
  }

  /**
   * Finalizar pausa activa
   */
  finalizarPausa(): void {
    if (!this.registroHoy?.id) return;

    this.cargando = true;
    this.asistenciaService.finalizarPausa(this.registroHoy.id).subscribe({
      next: (response: any) => {
        this.pausaActiva = null;
        this.totalPausas = response.total_pausas;
        this.snackBar.open(`✅ Pausa finalizada (${this.formatearDuracion(response.pausa.duracion)})`, 'Cerrar', { duration: 2000 });
        this.cargarPausas(); // Recargar lista
        this.cargando = false;
      },
      error: (error) => {
        const mensaje = error.error?.mensaje || 'Error al finalizar pausa';
        this.snackBar.open(mensaje, 'Cerrar', { duration: 3000 });
        this.cargando = false;
      },
    });
  }

  /**
   * Formato de hora (timestamp ISO)
   */
  formatearHora(hora?: string | Date): string {
    if (!hora) return '--:--';
    try {
      const date = new Date(hora);
      return date.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  }

  /**
   * Formatear duración (decimal horas a formato legible)
   */
  formatearDuracion(horasDecimales: number | null | undefined): string {
    if (horasDecimales === null || horasDecimales === undefined || horasDecimales === 0) {
      return '0m';
    }

    const horas = Math.floor(horasDecimales);
    const minutos = Math.round((horasDecimales % 1) * 60);

    // Si es menor a 1 hora, mostrar solo minutos
    if (horas === 0) {
      return `${minutos}m`;
    }

    // Si es 1 hora o más, mostrar ambos
    return `${horas}h ${minutos}m`;
  }

  /**
   * Calcular duración desde backend
   */
  obtenerDuracion(): string {
    if (!this.registroHoy?.hora_entrada) {
      return 'En progreso...';
    }

    // Si hay salida, usar horas_trabajadas del backend
    if (this.registroHoy.hora_salida && this.registroHoy.horas_trabajadas) {
      return this.formatearDuracion(this.registroHoy.horas_trabajadas);
    }

    // Si no hay salida, mostrar cronómetro en vivo
    if (!this.registroHoy.hora_salida) {
      return this.tiempoTranscurrido;
    }

    return 'En progreso...';
  }

  /**
   * Iniciar cronómetro en vivo
   */
  iniciarCronometro(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    // Actualizar inmediatamente
    this.actualizarCronometro();

    // Luego cada segundo
    this.intervalId = setInterval(() => {
      this.actualizarCronometro();
    }, 1000);
  }

  /**
   * Actualizar cronómetro
   */
  private actualizarCronometro(): void {
    if (this.registroHoy?.hora_entrada && !this.registroHoy.hora_salida) {
      const ahora = new Date();
      const entrada = new Date(this.registroHoy.hora_entrada);
      const diffMs = ahora.getTime() - entrada.getTime();

      const horas = Math.floor(diffMs / (1000 * 60 * 60));
      const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const segundos = Math.floor((diffMs % (1000 * 60)) / 1000);

      this.tiempoTranscurrido = `${this.pad(horas)}:${this.pad(minutos)}:${this.pad(segundos)}`;
    }
  }

  /**
   * Formatear número con cero a la izquierda
   */
  private pad(num: number): string {
    return num.toString().padStart(2, '0');
  }

  /**
   * Detener cronómetro
   */
  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    if (this.intervalIdHoraExtra) {
      clearInterval(this.intervalIdHoraExtra);
    }
  }

  // ==================== MÉTODOS PARA HORAS EXTRAS ====================

  /**
   * Cargar hora extra activa del usuario (como Promise)
   */
  cargarHoraExtraActivaPromise(): Promise<void> {
    return new Promise((resolve) => {
      this.horaExtraService.obtenerMiHoraExtraActiva().subscribe({
        next: (response: any) => {
          this.horaExtraActiva = response.data || null;
          if (this.horaExtraActiva) {
            this.iniciarCronometroHoraExtra();
          } else {
            if (this.intervalIdHoraExtra) {
              clearInterval(this.intervalIdHoraExtra);
              this.intervalIdHoraExtra = null;
            }
            this.tiempoHoraExtra = '00:00:00';
          }
          resolve();
        },
        error: (error) => {
          // No hay hora extra activa, es normal
          this.horaExtraActiva = null;
          this.tiempoHoraExtra = '00:00:00';
          resolve();
        }
      });
    });
  }

  /**
   * Cargar hora extra activa del usuario
   */
  cargarHoraExtraActiva(): void {
    this.horaExtraService.obtenerMiHoraExtraActiva().subscribe({
      next: (response: any) => {
        this.horaExtraActiva = response.data || null;
        if (this.horaExtraActiva) {
          this.iniciarCronometroHoraExtra();
        } else {
          if (this.intervalIdHoraExtra) {
            clearInterval(this.intervalIdHoraExtra);
            this.intervalIdHoraExtra = null;
          }
          this.tiempoHoraExtra = '00:00:00';
        }
      },
      error: (error) => {
        // No hay hora extra activa, es normal
        this.horaExtraActiva = null;
        this.tiempoHoraExtra = '00:00:00';
      }
    });
  }

  /**
   * Iniciar cronómetro de hora extra
   */
  iniciarCronometroHoraExtra(): void {
    if (this.intervalIdHoraExtra) {
      clearInterval(this.intervalIdHoraExtra);
    }

    // Actualizar inmediatamente
    this.actualizarCronometroHoraExtra();

    this.intervalIdHoraExtra = setInterval(() => {
      this.actualizarCronometroHoraExtra();
    }, 1000);
  }

  /**
   * Actualizar cronómetro de hora extra
   */
  private actualizarCronometroHoraExtra(): void {
    if (this.horaExtraActiva) {
      const inicio = new Date(this.horaExtraActiva.hora_inicio);
      const ahora = new Date();
      const diffMs = ahora.getTime() - inicio.getTime();
      
      const horas = Math.floor(diffMs / (1000 * 60 * 60));
      const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const segundos = Math.floor((diffMs % (1000 * 60)) / 1000);

      this.tiempoHoraExtra = `${this.pad(horas)}:${this.pad(minutos)}:${this.pad(segundos)}`;
    }
  }

  /**
   * Mostrar/ocultar formulario de hora extra
   */
  toggleFormHoraExtra(): void {
    this.mostrarFormHoraExtra = !this.mostrarFormHoraExtra;
    if (this.mostrarFormHoraExtra) {
      this.numeroTicket = '';
      this.tipoTrabajo = 'instalacion';
    }
  }

  /**
   * Iniciar hora extra
   */
  async iniciarHoraExtra(): Promise<void> {
    const numero = this.numeroTicket.trim();

    if (!numero) {
      const campo = this.tipoTrabajo === 'averia' ? 'número de ticket' : 'número NET';
      this.snackBar.open(`❌ Debes ingresar el ${campo}`, 'Cerrar', { duration: 3000 });
      return;
    }

    if (this.tipoTrabajo === 'averia' && !/^\d+$/.test(numero)) {
      this.snackBar.open('❌ El número de ticket de avería debe ser solo números', 'Cerrar', { duration: 3000 });
      return;
    }

    if (!this.fotoCapturadaHoraExtra) {
      this.snackBar.open('❌ Debes capturar una foto antes de iniciar hora extra', 'Cerrar', { duration: 3000 });
      return;
    }

    try {
      this.cargando = true;

      // El GPS es del dispositivo (no requiere señal de datos), así que se obtiene igual sin conexión
      const gps = await this.obtenerGPS();
      const foto = this.fotoCapturadaHoraExtra!;
      const numeroTicket = this.numeroTicket.trim();
      const tipoTrabajo = this.tipoTrabajo;
      const capturadoEn = new Date().toISOString();
      const recordAsistenciaId = this.registroHoy?.id;

      if (!this.conexionService.enLinea) {
        await this.colaOfflineService.encolar({
          tipo: 'iniciar_hora_extra',
          capturadoEn,
          gps,
          foto,
          fotoNombre: foto.name,
          numeroTicket,
          tipoTrabajo,
          recordAsistenciaId,
        });
        this.confirmarGuardadoOffline('Inicio de hora extra');
        this.numeroTicket = '';
        this.mostrarFormHoraExtra = false;
        this.limpiarFoto('horaExtra');
        this.cargando = false;
        return;
      }

      // Si ya existe un registro de asistencia hoy, vincular la hora extra a ese registro
      // en vez de crear uno independiente
      const iniciarHoraExtra$ = recordAsistenciaId
        ? this.horaExtraService.iniciarHoraExtra(recordAsistenciaId, numeroTicket, gps?.latitud ?? null, gps?.longitud ?? null, foto, capturadoEn, tipoTrabajo)
        : this.horaExtraService.iniciarHoraExtraDirecta(numeroTicket, gps?.latitud ?? null, gps?.longitud ?? null, foto, capturadoEn, tipoTrabajo);

      // Iniciar hora extra
      iniciarHoraExtra$.subscribe({
          next: (response: any) => {
            this.horaExtraActiva = response.data;
            this.numeroTicket = '';
            this.mostrarFormHoraExtra = false;
            this.limpiarFoto('horaExtra');

            // Solo iniciar cronómetro de hora extra
            this.iniciarCronometroHoraExtra();
            this.snackBar.open('✅ Hora extra iniciada correctamente', 'Cerrar', { duration: 3000 });
            this.cargando = false;
          },
          error: async (error) => {
            if (error.status === 0) {
              await this.colaOfflineService.encolar({
                tipo: 'iniciar_hora_extra',
                capturadoEn,
                gps,
                foto,
                fotoNombre: foto.name,
                numeroTicket,
                tipoTrabajo,
                recordAsistenciaId,
              });
              this.confirmarGuardadoOffline('Inicio de hora extra');
              this.numeroTicket = '';
              this.mostrarFormHoraExtra = false;
              this.limpiarFoto('horaExtra');
              this.cargando = false;
              return;
            }
            const mensaje = error.error?.mensaje || 'Error al iniciar hora extra';
            this.snackBar.open(mensaje, 'Cerrar', { duration: 3000 });
            this.cargando = false;
          },
        });
    } catch (error) {
      this.snackBar.open(`Error: ${error}`, 'Cerrar', { duration: 3000 });
      this.cargando = false;
    }
  }

  /**
   * Finalizar hora extra
   */
  async finalizarHoraExtraActiva(): Promise<void> {
    if (!this.horaExtraActiva) return;

    if (!this.fotoCapturadaHoraExtra) {
      this.snackBar.open('❌ Debes capturar una foto antes de finalizar hora extra', 'Cerrar', { duration: 3000 });
      return;
    }

    try {
      this.cargando = true;

      // El GPS es del dispositivo (no requiere señal de datos), así que se obtiene igual sin conexión
      const gps = await this.obtenerGPS();
      const foto = this.fotoCapturadaHoraExtra!;
      const horaExtraId = this.horaExtraActiva!.id;
      const capturadoEn = new Date().toISOString();

      const detenerCronometroYLimpiar = () => {
        this.horaExtraActiva = null;
        this.tiempoHoraExtra = '00:00:00';
        this.limpiarFoto('horaExtra');
        if (this.intervalIdHoraExtra) {
          clearInterval(this.intervalIdHoraExtra);
          this.intervalIdHoraExtra = null;
        }
      };

      if (!this.conexionService.enLinea) {
        await this.colaOfflineService.encolar({
          tipo: 'finalizar_hora_extra',
          capturadoEn,
          gps,
          foto,
          fotoNombre: foto.name,
          horaExtraId,
        });
        this.confirmarGuardadoOffline('Fin de hora extra');
        detenerCronometroYLimpiar();
        this.cargando = false;
        return;
      }

      // Finalizar hora extra
      this.horaExtraService
        .finalizarHoraExtra(horaExtraId, gps?.latitud ?? null, gps?.longitud ?? null, foto, capturadoEn)
        .subscribe({
          next: (response: any) => {
            this.snackBar.open(`✅ Hora extra finalizada (${this.formatearDuracion(response.data.duracion)})`, 'Cerrar', { duration: 3000 });
            detenerCronometroYLimpiar();
            this.cargando = false;
          },
          error: async (error) => {
            if (error.status === 0) {
              await this.colaOfflineService.encolar({
                tipo: 'finalizar_hora_extra',
                capturadoEn,
                gps,
                foto,
                fotoNombre: foto.name,
                horaExtraId,
              });
              this.confirmarGuardadoOffline('Fin de hora extra');
              detenerCronometroYLimpiar();
              this.cargando = false;
              return;
            }
            const mensaje = error.error?.mensaje || 'Error al finalizar hora extra';
            this.snackBar.open(mensaje, 'Cerrar', { duration: 3000 });
            this.cargando = false;
          },
        });
    } catch (error) {
      this.snackBar.open(`Error: ${error}`, 'Cerrar', { duration: 3000 });
      this.cargando = false;
    }
  }

  /**
   * Abre el modal de reporte de cierre (descripción + fotos), obligatorio para
   * departamentos con requiere_reporte_cierre (p. ej. Taller) al finalizar jornada
   */
  private abrirReporteCierre(recordId: number): void {
    this.dialog.open(ReporteCierreDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      disableClose: true,
      data: { recordId },
    });
  }

  /** Cambia de página del carrusel (por tap en la pestaña o por el mini-indicador) */
  irATab(tab: 'asistencia' | 'horaExtra'): void {
    this.tabActiva = tab;
    const track = this.swipeTrack?.nativeElement;
    if (!track) return;
    const indice = tab === 'asistencia' ? 0 : 1;
    track.scrollTo({ left: indice * track.clientWidth, behavior: 'smooth' });
  }

  /** Sincroniza la pestaña activa cuando el usuario desliza con el dedo */
  onSwipeScroll(): void {
    const track = this.swipeTrack?.nativeElement;
    if (!track || track.clientWidth === 0) return;
    const indice = Math.round(track.scrollLeft / track.clientWidth);
    this.tabActiva = indice === 0 ? 'asistencia' : 'horaExtra';
  }

  limpiarFoto(tipo: 'asistencia' | 'horaExtra' = 'asistencia'): void {
    if (tipo === 'asistencia') {
      this.fotoCapturadaAsistencia = null;
      this.previewFotoAsistencia = null;
      localStorage.removeItem('previewFoto');
    } else {
      this.fotoCapturadaHoraExtra = null;
      this.previewFotoHoraExtra = null;
    }
  }
}
