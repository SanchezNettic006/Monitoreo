import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TipoTramitePipe } from '../../../../pipes/tipo-tramite.pipe';

@Component({
  selector: 'app-reprogramar-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    TipoTramitePipe,
  ],
  template: `
    <div class="dialog-container">
      <mat-dialog-content>
        <div class="dialog-header">
          <mat-icon class="header-icon">event_repeat</mat-icon>
          <h2>Reprogramar solicitud</h2>
        </div>

        <div class="solicitud-info">
          <p><strong>Empleado:</strong> {{ data.solicitud.empleado?.nombre }} {{ data.solicitud.empleado?.apellido }}</p>
          <p><strong>Tipo:</strong> {{ data.solicitud.tipo | tipoTramite }}</p>
          <p>
            <strong>Fecha actual:</strong> {{ data.solicitud.fecha_inicio | date: 'dd/MM/yyyy' }}
            <span *ngIf="data.solicitud.fecha_fin"> a {{ data.solicitud.fecha_fin | date: 'dd/MM/yyyy' }}</span>
          </p>
        </div>

        <form [formGroup]="formulario" class="form-section">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Nueva fecha de inicio</mat-label>
            <input matInput [matDatepicker]="picker1" formControlName="nuevaFechaInicio" required />
            <mat-datepicker-toggle matSuffix [for]="picker1"></mat-datepicker-toggle>
            <mat-datepicker #picker1></mat-datepicker>
            <mat-error>La nueva fecha de inicio es requerida</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" *ngIf="data.solicitud.fecha_fin">
            <mat-label>Nueva fecha de fin</mat-label>
            <input matInput [matDatepicker]="picker2" formControlName="nuevaFechaFin" />
            <mat-datepicker-toggle matSuffix [for]="picker2"></mat-datepicker-toggle>
            <mat-datepicker #picker2></mat-datepicker>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Motivo del cambio</mat-label>
            <textarea matInput rows="3" formControlName="motivo" placeholder="Ej: salió una falla y se necesitó al técnico ese día"></textarea>
            <mat-hint>Se le notifica al empleado por correo y Telegram</mat-hint>
          </mat-form-field>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">Cancelar</button>
        <button mat-raised-button color="primary" (click)="onConfirm()" [disabled]="!formulario.valid">
          Reprogramar
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .dialog-container {
        width: 100%;
      }

      mat-dialog-content {
        padding: 20px 0;
      }

      .dialog-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 20px;
        padding-bottom: 16px;
        border-bottom: 2px solid #e0e0e0;
        color: #2b8a3e;

        .header-icon {
          font-size: 28px;
          width: 28px;
          height: 28px;
          color: #2b8a3e;
        }

        h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }
      }

      .solicitud-info {
        background: #f5f5f5;
        padding: 12px 16px;
        border-radius: 4px;
        margin-bottom: 20px;
        font-size: 14px;

        p {
          margin: 6px 0;
          line-height: 1.5;

          strong {
            color: #333;
            font-weight: 600;
          }
        }
      }

      .form-section {
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin: 20px 0;
      }

      .full-width {
        width: 100%;
      }

      mat-dialog-actions {
        padding: 20px 0 0 0;
        border-top: 1px solid #e0e0e0;
        margin-top: 20px;
      }
    `,
  ],
})
export class ReprogramarDialogComponent {
  formulario: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<ReprogramarDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: FormBuilder,
  ) {
    this.formulario = this.fb.group({
      nuevaFechaInicio: ['', Validators.required],
      nuevaFechaFin: [''],
      motivo: [''],
    });
  }

  onConfirm() {
    if (this.formulario.invalid) return;

    const valor = this.formulario.value;
    const formatear = (fecha: Date | null) => {
      if (!fecha) return undefined;
      const d = new Date(fecha);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    this.dialogRef.close({
      nuevaFechaInicio: formatear(valor.nuevaFechaInicio),
      nuevaFechaFin: formatear(valor.nuevaFechaFin),
      motivo: valor.motivo,
    });
  }

  onCancel() {
    this.dialogRef.close();
  }
}
