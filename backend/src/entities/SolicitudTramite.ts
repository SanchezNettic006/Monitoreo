import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Empleado } from './Empleado';
import { SolicitudHistorial } from './SolicitudHistorial';

export type TipoTramite = 'vacaciones' | 'ausencia' | 'cambio_jornada';
export type EstadoSolicitud = 'pendiente' | 'aprobada' | 'rechazada' | 'cancelada';

@Entity('solicitud_tramite')
export class SolicitudTramite {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Empleado)
  @JoinColumn({ name: 'empleado_id' })
  empleado!: Empleado;

  @Column({ name: 'empleado_id' })
  empleado_id!: number;

  @Column({ type: 'varchar', length: 30 })
  tipo!: TipoTramite; // vacaciones, ausencia, cambio_jornada

  @Column({ type: 'varchar', length: 30, default: 'pendiente' })
  estado!: EstadoSolicitud; // pendiente, aprobada, rechazada, cancelada

  @Column({ type: 'date' })
  fecha_inicio!: string;

  @Column({ type: 'date', nullable: true })
  fecha_fin?: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  dias_solicitados!: number;

  @Column({ type: 'text', nullable: true })
  motivo?: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({ type: 'text', nullable: true })
  observacion_admin?: string;

  @Column({ name: 'aprobador_id', nullable: true })
  aprobador_id?: number;

  @OneToMany(() => SolicitudHistorial, (historial) => historial.solicitud)
  historial!: SolicitudHistorial[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at!: Date;
}
