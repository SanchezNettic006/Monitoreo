import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { AsistenciaService, GPS, RecordAsistencia } from '../../services/asistencia.service';

@Component({
  selector: 'app-registro-asistencia',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
  ],
  templateUrl: './registro-asistencia.component.html',
  styleUrl: './registro-asistencia.component.scss',
})
export class RegistroAsistenciaComponent implements OnInit {
  cargando = false;
  registroHoy: RecordAsistencia | null = null;
  estado: 'sin_registro' | 'activo' | 'finalizado' = 'sin_registro';
  gpsActual: GPS | null = null;
  fotoCapturada: File | null = null;
  previewFoto: string | null = null;

  constructor(
    private asistenciaService: AsistenciaService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    // Restaurar foto capturada del localStorage si existe
    const previewGuardado = localStorage.getItem('previewFoto');
    if (previewGuardado) {
      this.previewFoto = previewGuardado;
    }
    
    this.cargarRegistroHoy();
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
   * Obtener GPS actual
   */
  async obtenerGPS(): Promise<GPS> {
    try {
      this.gpsActual = await this.asistenciaService.obtenerGPS();
      this.snackBar.open('✅ GPS obtenido', 'Cerrar', { duration: 2000 });
      return this.gpsActual;
    } catch (error) {
      this.snackBar.open(`Error GPS: ${error}`, 'Cerrar', { duration: 3000 });
      throw error;
    }
  }

  /**
   * Capturar foto con webcam
   */
  capturarFoto(): void {
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
                this.fotoCapturada = new File(
                  [blob],
                  `foto_${Date.now()}.jpg`,
                  {
                    type: 'image/jpeg',
                  }
                );

                // Mostrar preview y guardar en localStorage
                const reader = new FileReader();
                reader.onload = (e: any) => {
                  this.previewFoto = e.target.result;
                  // Guardar preview en localStorage para persistencia
                  if (this.previewFoto) {
                    localStorage.setItem('previewFoto', this.previewFoto);
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
    if (!this.fotoCapturada) {
      this.snackBar.open('❌ Debes capturar una foto antes de hacer CHECK-IN', 'Cerrar', {
        duration: 3000,
      });
      return;
    }

    try {
      this.cargando = true;

      // Obtener GPS
      const gps = await this.obtenerGPS();

      // Registrar entrada
      this.asistenciaService
        .registrarEntrada(gps, this.fotoCapturada)
        .subscribe({
          next: (response: any) => {
            this.registroHoy = response.record;
            this.estado = 'activo';
            this.fotoCapturada = null;
            this.previewFoto = null;
            localStorage.removeItem('previewFoto');

            this.snackBar.open(response.mensaje, 'Cerrar', { duration: 3000 });
            this.cargando = false;
          },
          error: (error) => {
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

  /**
   * Realizar CHECK-OUT
   */
  async realizarCheckOut(): Promise<void> {
    // Validar que existe foto
    if (!this.fotoCapturada) {
      this.snackBar.open('❌ Debes capturar una foto antes de hacer CHECK-OUT', 'Cerrar', {
        duration: 3000,
      });
      return;
    }

    try {
      this.cargando = true;

      // Obtener GPS
      const gps = await this.obtenerGPS();

      // Registrar salida
      this.asistenciaService
        .registrarSalida(gps, this.fotoCapturada)
        .subscribe({
          next: (response: any) => {
            this.registroHoy = response.record;
            this.estado = 'finalizado';
            this.fotoCapturada = null;
            this.previewFoto = null;
            localStorage.removeItem('previewFoto');

            this.snackBar.open(response.mensaje, 'Cerrar', { duration: 3000 });
            this.cargando = false;
          },
          error: (error) => {
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
   * Calcular duración desde backend
   */
  obtenerDuracion(): string {
    if (!this.registroHoy?.hora_entrada || !this.registroHoy?.hora_salida) {
      return 'En progreso...';
    }

    // Usar horas_trabajadas del backend si está disponible
    if (this.registroHoy.horas_trabajadas !== null && this.registroHoy.horas_trabajadas !== undefined) {
      const horas = Math.floor(this.registroHoy.horas_trabajadas);
      const minutos = Math.round((this.registroHoy.horas_trabajadas % 1) * 60);
      return `${horas}h ${minutos}m`;
    }

    return 'En progreso...';
  }

  limpiarFoto(): void {
    this.fotoCapturada = null;
    this.previewFoto = null;
    localStorage.removeItem('previewFoto');
  }
}
