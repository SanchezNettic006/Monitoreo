import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService, Usuario } from '../../services/auth.service';
import { TelegramService } from '../../services/telegram.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-mi-perfil',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './mi-perfil.component.html',
  styleUrl: './mi-perfil.component.scss',
})
export class MiPerfilComponent implements OnInit {
  cargando = false;
  cargandoPerfil = false;
  fotoSeleccionada: File | null = null;
  previewFoto: string | null = null;
  perfil: Usuario | null = null;

  telegramVinculado = false;
  cargandoTelegram = false;

  constructor(
    private authService: AuthService,
    private dialogRef: MatDialogRef<MiPerfilComponent>,
    private snackBar: MatSnackBar,
    private telegramService: TelegramService,
  ) {}

  ngOnInit(): void {
    const actual = this.authService.getCurrentUser()?.foto_perfil;
    if (actual) {
      this.previewFoto = this.getFotoUrl(actual);
    }
    this.cargarPerfil();
    this.cargarEstadoTelegram();
  }

  cargarEstadoTelegram(): void {
    this.telegramService.obtenerEstado().subscribe({
      next: (estado) => (this.telegramVinculado = estado.vinculado),
      error: () => (this.telegramVinculado = false),
    });
  }

  /** Abre el chat con el bot en una pestaña nueva; la vinculación se confirma sola al presionar Start */
  vincularTelegram(): void {
    this.cargandoTelegram = true;
    this.telegramService.generarVinculo().subscribe({
      next: (url) => {
        window.open(url, '_blank');
        this.cargandoTelegram = false;
        this.snackBar.open(
          '📲 Se abrió Telegram. Presiona "Iniciar/Start" en el chat con el bot para completar la vinculación.',
          'Cerrar',
          { duration: 6000 },
        );
      },
      error: () => {
        this.cargandoTelegram = false;
        this.snackBar.open('Error al generar el link de Telegram', 'Cerrar', { duration: 3000 });
      },
    });
  }

  desvincularTelegram(): void {
    this.cargandoTelegram = true;
    this.telegramService.desvincular().subscribe({
      next: () => {
        this.telegramVinculado = false;
        this.cargandoTelegram = false;
        this.snackBar.open('Telegram desvinculado', 'Cerrar', { duration: 3000 });
      },
      error: () => {
        this.cargandoTelegram = false;
        this.snackBar.open('Error al desvincular Telegram', 'Cerrar', { duration: 3000 });
      },
    });
  }

  cargarPerfil(): void {
    this.cargandoPerfil = true;
    this.authService.obtenerPerfil().subscribe({
      next: (response) => {
        this.perfil = response.data;
        this.cargandoPerfil = false;
      },
      error: () => {
        this.cargandoPerfil = false;
      },
    });
  }

  get rolLabel(): string {
    switch (this.perfil?.rol) {
      case 'admin': return 'Administrador';
      case 'lider': return 'Líder de Departamento';
      default: return 'Empleado';
    }
  }

  getFotoUrl(ruta: string): string {
    if (ruta.startsWith('/')) {
      return `${environment.apiUrl.replace('/api', '')}${ruta}`;
    }
    return ruta;
  }

  onFotoSelected(event: any): void {
    const archivo = event.target.files[0];
    if (!archivo) return;

    if (!['image/jpeg', 'image/png', 'image/gif'].includes(archivo.type)) {
      this.snackBar.open('Solo se permiten imágenes (JPEG, PNG, GIF)', 'Cerrar', { duration: 3000 });
      return;
    }
    if (archivo.size > 5 * 1024 * 1024) {
      this.snackBar.open('La imagen no puede pesar más de 5MB', 'Cerrar', { duration: 3000 });
      return;
    }

    this.fotoSeleccionada = archivo;
    const reader = new FileReader();
    reader.onload = (e: any) => (this.previewFoto = e.target.result);
    reader.readAsDataURL(archivo);
  }

  subirFoto(): void {
    if (!this.fotoSeleccionada) return;

    this.cargando = true;
    this.authService.subirFotoPropia(this.fotoSeleccionada).subscribe({
      next: () => {
        this.cargando = false;
        this.snackBar.open('Foto de perfil actualizada', 'Cerrar', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: () => {
        this.cargando = false;
        this.snackBar.open('Error al subir la foto', 'Cerrar', { duration: 3000 });
      },
    });
  }

  cerrar(): void {
    this.dialogRef.close(false);
  }
}
