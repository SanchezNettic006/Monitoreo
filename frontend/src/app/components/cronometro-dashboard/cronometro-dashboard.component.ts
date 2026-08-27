import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AsistenciaService } from '../../services/asistencia.service';
import { HoraExtraService, HoraExtraResponse } from '../../services/hora-extra.service';
import { CrearHoraExtraModalComponent } from '../crear-hora-extra-modal/crear-hora-extra-modal.component';
import { FinalizarHoraExtraModalComponent } from '../finalizar-hora-extra-modal/finalizar-hora-extra-modal.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-cronometro-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatDialogModule, MatSnackBarModule],
  templateUrl: './cronometro-dashboard.component.html',
  styleUrl: './cronometro-dashboard.component.scss',
})
export class CronometroDashboardComponent implements OnInit, OnDestroy {
  // Asistencia normal
  tiempoTranscurrido = '00:00:00';
  horaEntrada: Date | null = null;
  estado: 'inactivo' | 'activo' | 'salida' = 'inactivo';
  cargando = false;
  intervalId: any = null;

  // Horas extras
  horaExtraActiva: HoraExtraResponse | null = null;
  tiempoHoraExtra = '00:00:00';
  intervalIdHoraExtra: any = null;

  constructor(
    private asistenciaService: AsistenciaService,
    private horaExtraService: HoraExtraService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.cargarRegistroHoy();
    this.cargarHoraExtraActiva();
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    if (this.intervalIdHoraExtra) {
      clearInterval(this.intervalIdHoraExtra);
    }
  }

  /**
   * Cargar registro de asistencia de hoy
   */
  cargarRegistroHoy(): void {
    this.cargando = true;
    this.asistenciaService.obtenerRegistroHoy().subscribe({
      next: (response) => {
        const record = response.data;
        
        if (record && record.hora_entrada && !record.hora_salida) {
          // Hay registro activo (check-in hecho, check-out pendiente)
          this.horaEntrada = new Date(record.hora_entrada);
          this.estado = 'activo';
          this.iniciarCronometro();
        } else if (record && record.hora_entrada && record.hora_salida) {
          // Check-in y check-out completados
          this.estado = 'salida';
          this.horaEntrada = new Date(record.hora_entrada);
        } else {
          // Sin registro de entrada hoy
          this.estado = 'inactivo';
        }
        
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar registro:', error);
        this.estado = 'inactivo';
        this.cargando = false;
      },
    });
  }

  /**
   * Iniciar cronómetro
   */
  iniciarCronometro(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(() => {
      if (this.horaEntrada) {
        const ahora = new Date();
        const diffMs = ahora.getTime() - this.horaEntrada.getTime();
        
        const horas = Math.floor(diffMs / (1000 * 60 * 60));
        const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const segundos = Math.floor((diffMs % (1000 * 60)) / 1000);

        this.tiempoTranscurrido = `${this.pad(horas)}:${this.pad(minutos)}:${this.pad(segundos)}`;
      }
    }, 1000);
  }

  /**
   * Ir a check-in
   */
  irACheckIn(): void {
    this.router.navigate(['/asistencia']);
  }

  /**
   * Formatear número con cero a la izquierda
   */
  private pad(num: number): string {
    return num.toString().padStart(2, '0');
  }

  /**
   * Obtener mensaje de estado
   */
  getStatusMessage(): string {
    switch (this.estado) {
      case 'activo':
        return 'Trabajando actualmente';
      case 'salida':
        return 'Jornada completada';
      default:
        return 'No has iniciado sesión';
    }
  }

  /**
   * Obtener color de estado
   */
  getStatusColor(): string {
    switch (this.estado) {
      case 'activo':
        return 'active';
      case 'salida':
        return 'completed';
      default:
        return 'inactive';
    }
  }

  // ==================== MÉTODOS PARA HORAS EXTRAS ====================

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

    this.intervalIdHoraExtra = setInterval(() => {
      if (this.horaExtraActiva) {
        const inicio = new Date(this.horaExtraActiva.hora_inicio);
        const ahora = new Date();
        const diffMs = ahora.getTime() - inicio.getTime();
        
        const horas = Math.floor(diffMs / (1000 * 60 * 60));
        const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const segundos = Math.floor((diffMs % (1000 * 60)) / 1000);

        this.tiempoHoraExtra = `${this.pad(horas)}:${this.pad(minutos)}:${this.pad(segundos)}`;
      }
    }, 1000);
  }

  /**
   * Abrir modal para crear hora extra
   */
  abrirCrearHoraExtra(): void {
    const dialogRef = this.dialog.open(CrearHoraExtraModalComponent, {
      width: '500px',
      maxWidth: '90vw',
      disableClose: false
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.snackBar.open('Hora extra iniciada correctamente', 'OK', { duration: 3000 });
        this.cargarHoraExtraActiva();
      }
    });
  }

  /**
   * Abrir modal para finalizar hora extra
   */
  finalizarHoraExtra(): void {
    if (!this.horaExtraActiva) return;

    const dialogRef = this.dialog.open(FinalizarHoraExtraModalComponent, {
      width: '500px',
      maxWidth: '90vw',
      disableClose: false,
      data: this.horaExtraActiva
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.snackBar.open('Hora extra finalizada correctamente', 'OK', { duration: 3000 });
        this.cargarHoraExtraActiva();
      }
    });
  }

  /**
   * Formatear hora
   */
  formatearHora(fecha: string | Date | null | undefined): string {
    if (!fecha) return '--:--';
    try {
      const date = new Date(fecha);
      return date.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  }
}
