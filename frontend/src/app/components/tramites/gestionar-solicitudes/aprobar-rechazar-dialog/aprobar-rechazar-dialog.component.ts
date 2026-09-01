import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TipoTramitePipe } from '../../../../pipes/tipo-tramite.pipe';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-aprobar-rechazar-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    TipoTramitePipe,
  ],
  template: `
    <div class="dialog-container">
      <mat-dialog-content>
        <div class="dialog-header" [class.aprobar]="data.accion === 'aprobar'" [class.rechazar]="data.accion === 'rechazar'">
          <mat-icon class="header-icon">
            {{ data.accion === 'aprobar' ? 'check_circle' : 'cancel' }}
          </mat-icon>
          <h2>{{ getTitle() }}</h2>
        </div>

        <div class="solicitud-info">
          <p>
            <strong>Empleado:</strong> {{ data.solicitud.empleado?.nombre }} {{ data.solicitud.empleado?.apellido }}
          </p>
          <p>
            <strong>Tipo:</strong> {{ data.solicitud.tipo | tipoTramite }}
          </p>
          <p>
            <strong>Fecha Inicio:</strong> {{ data.solicitud.fecha_inicio | date: 'dd/MM/yyyy' }}
          </p>
          <p *ngIf="data.solicitud.fecha_fin">
            <strong>Fecha Fin:</strong> {{ data.solicitud.fecha_fin | date: 'dd/MM/yyyy' }}
          </p>
          <p>
            <strong>Motivo:</strong> {{ data.solicitud.motivo || '-' }}
          </p>
          <div *ngIf="data.solicitud.url_foto" class="comprobante">
            <strong>Comprobante:</strong>
            <a [href]="urlFoto(data.solicitud.url_foto)" target="_blank">
              <img [src]="urlFoto(data.solicitud.url_foto)" alt="Comprobante de la cita" />
            </a>
          </div>
        </div>

        <form [formGroup]="formulario" class="form-section">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Comentario Interno</mat-label>
            <textarea matInput rows="3" formControlName="comentario"></textarea>
            <mat-hint>Para referencia del equipo administrativo</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" *ngIf="data.accion === 'rechazar'">
            <mat-label>Motivo del Rechazo (visible para empleado)</mat-label>
            <textarea matInput rows="3" formControlName="observacion" required></textarea>
            <mat-error>Este campo es requerido para rechazar</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" *ngIf="data.accion === 'aprobar'">
            <mat-label>Observaciones (opcional)</mat-label>
            <textarea matInput rows="3" formControlName="observacion"></textarea>
          </mat-form-field>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">
          Cancelar
        </button>
        <button
          mat-raised-button
          [color]="data.accion === 'aprobar' ? 'accent' : 'warn'"
          (click)="onConfirm()"
          [disabled]="!formulario.valid"
        >
          {{ data.accion === 'aprobar' ? 'Aprobar' : 'Rechazar' }}
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

        &.aprobar {
          color: #2b8a3e;

          .header-icon {
            color: #2b8a3e;
          }
        }

        &.rechazar {
          color: #d32f2f;

          .header-icon {
            color: #d32f2f;
          }
        }

        .header-icon {
          font-size: 28px;
          width: 28px;
          height: 28px;
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

        .comprobante {
          margin-top: 10px;

          img {
            display: block;
            max-width: 160px;
            max-height: 160px;
            margin-top: 6px;
            border-radius: 6px;
            border: 1px solid #ddd;
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
export class AprobarRechazarDialogComponent {
  formulario: FormGroup;

  urlFoto(rutaRelativa: string): string {
    return `${environment.apiUrl.replace('/api', '')}${rutaRelativa}`;
  }

  constructor(
    public dialogRef: MatDialogRef<AprobarRechazarDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: FormBuilder,
  ) {
    this.formulario = this.fb.group({
      comentario: [''],
      observacion: [
        '',
        this.data.accion === 'rechazar' ? Validators.required : [],
      ],
    });
  }

  getTitle(): string {
    return this.data.accion === 'aprobar'
      ? '¿Aprobar esta solicitud?'
      : '¿Rechazar esta solicitud?';
  }

  onConfirm() {
    if (this.formulario.valid) {
      this.dialogRef.close(this.formulario.value);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}
