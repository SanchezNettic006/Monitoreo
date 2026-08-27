import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { HoraExtraResponse } from '../../../services/hora-extra.service';

@Component({
  selector: 'app-detalle-hora-extra-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './detalle-hora-extra-dialog.component.html',
  styleUrl: './detalle-hora-extra-dialog.component.scss',
})
export class DetalleHoraExtraDialogComponent {
  horaExtra: HoraExtraResponse;

  constructor(
    public dialogRef: MatDialogRef<DetalleHoraExtraDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { horaExtra: HoraExtraResponse },
  ) {
    this.horaExtra = data.horaExtra;
  }

  formatearFecha(fecha?: string | Date | null): string {
    if (!fecha) return '--';
    return new Date(fecha).toLocaleDateString('es-SV', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  formatearHora(fecha?: string | Date | null): string {
    if (!fecha) return '--';
    return new Date(fecha).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' });
  }

  formatearDuracion(horas?: number | string | null): string {
    const valor = Number(horas);
    if (horas === null || horas === undefined || isNaN(valor)) return '--';
    const h = Math.floor(valor);
    const m = Math.round((valor % 1) * 60);
    return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`;
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}
