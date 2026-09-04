import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SolicitudService } from '../../../services/solicitud.service';

interface FilaDepartamento {
  departamento: string;
  cantidad: number;
}

/**
 * Desglose por departamento de trámites APROBADOS de un mes (todos los tipos:
 * vacaciones, reposición, citas médicas, enfermedad, estudios, cumpleaños, etc.),
 * abierto desde la tarjeta "Ausencias del Mes" del Home.
 */
@Component({
  selector: 'app-ausencias-departamento-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>event_busy</mat-icon>
      Ausencias del Mes por Departamento
    </h2>

    <mat-dialog-content>
      <mat-form-field appearance="fill" class="mes-selector">
        <mat-label>Mes</mat-label>
        <mat-select [(ngModel)]="mesSeleccionado" (selectionChange)="cargar()">
          <mat-option *ngFor="let opcion of opcionesMes" [value]="opcion.value">{{ opcion.label }}</mat-option>
        </mat-select>
      </mat-form-field>

      <div class="loading" *ngIf="cargando">
        <mat-spinner diameter="32"></mat-spinner>
      </div>

      <table class="tabla-deptos" *ngIf="!cargando && filas.length > 0">
        <thead>
          <tr>
            <th>Departamento</th>
            <th>Cantidad</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let fila of filas">
            <td>{{ fila.departamento }}</td>
            <td class="cantidad">{{ fila.cantidad }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="fila-total">
            <td>Total</td>
            <td class="cantidad">{{ total }}</td>
          </tr>
        </tfoot>
      </table>

      <p class="sin-datos" *ngIf="!cargando && filas.length === 0">
        Sin trámites aprobados este mes
      </p>
    </mat-dialog-content>

    <mat-dialog-actions>
      <span class="spacer"></span>
      <button mat-stroked-button (click)="dialogRef.close()">Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2[mat-dialog-title] {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
    }
    .mes-selector {
      width: 220px;
      margin-bottom: 12px;
    }
    .loading {
      display: flex;
      justify-content: center;
      padding: 30px 0;
    }
    .tabla-deptos {
      width: 100%;
      border-collapse: collapse;
    }
    .tabla-deptos th {
      text-align: left;
      font-size: 12px;
      text-transform: uppercase;
      color: #999;
      padding: 8px 4px;
      border-bottom: 2px solid #eee;
    }
    .tabla-deptos td {
      padding: 10px 4px;
      border-bottom: 1px solid #f0f0f0;
    }
    .cantidad {
      text-align: right;
      font-weight: 600;
      color: #2b8a3e;
    }
    .fila-total td {
      border-bottom: none;
      border-top: 2px solid #eee;
      font-weight: 700;
      color: #333;
    }
    .fila-total .cantidad {
      color: #2b8a3e;
    }
    .sin-datos {
      text-align: center;
      color: #999;
      padding: 30px 0;
    }
    mat-dialog-actions {
      display: flex;
    }
    .spacer {
      flex: 1;
    }
  `],
})
export class AusenciasDepartamentoDialogComponent implements OnInit {
  mesSeleccionado = new Date().toISOString().slice(0, 7);
  opcionesMes: { value: string; label: string }[] = [];
  filas: FilaDepartamento[] = [];
  total = 0;
  cargando = false;

  constructor(
    public dialogRef: MatDialogRef<AusenciasDepartamentoDialogComponent>,
    private solicitudService: SolicitudService,
  ) {}

  ngOnInit(): void {
    this.opcionesMes = this.generarOpcionesMes();
    this.cargar();
  }

  private generarOpcionesMes(): { value: string; label: string }[] {
    const opciones: { value: string; label: string }[] = [];
    const hoy = new Date();
    for (let i = 0; i < 6; i++) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const value = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      const label = fecha.toLocaleDateString('es-SV', { month: 'long', year: 'numeric' });
      opciones.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return opciones;
  }

  cargar(): void {
    this.cargando = true;
    this.solicitudService.obtenerSolicitudesAprobadas(this.mesSeleccionado).subscribe({
      next: (data) => {
        const conteo = new Map<string, number>();
        for (const s of data) {
          const depto = s.departamento_nombre || s.empleado?.departamento?.nombre || 'Sin departamento';
          conteo.set(depto, (conteo.get(depto) || 0) + 1);
        }
        this.filas = Array.from(conteo.entries())
          .map(([departamento, cantidad]) => ({ departamento, cantidad }))
          .sort((a, b) => b.cantidad - a.cantidad);
        this.total = data.length;
        this.cargando = false;
      },
      error: () => {
        this.filas = [];
        this.total = 0;
        this.cargando = false;
      },
    });
  }
}
