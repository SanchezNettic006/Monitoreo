import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SolicitudTramite } from './SolicitudTramite';

export type TipoNotificacion = 'solicitud_creada' | 'aprobada' | 'rechazada';
export type EstadoNotificacion = 'pendiente' | 'enviado' | 'fallido';

@Entity('notificacion_email')
export class NotificacionEmail {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => SolicitudTramite)
  @JoinColumn({ name: 'solicitud_id' })
  solicitud?: SolicitudTramite;

  @Column({ name: 'solicitud_id', nullable: true })
  solicitud_id?: number;

  @Column({ type: 'varchar', length: 30 })
  tipo!: TipoNotificacion; // solicitud_creada, aprobada, rechazada

  @Column({ type: 'varchar', length: 255 })
  destinatario!: string;

  @Column({ type: 'varchar', length: 255 })
  asunto!: string;

  @Column({ type: 'text' })
  cuerpo!: string;

  @Column({ type: 'varchar', length: 30, default: 'pendiente' })
  estado!: EstadoNotificacion; // pendiente, enviado, fallido

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @Column({ type: 'timestamp', nullable: true })
  enviado_at?: Date;

  @Column({ type: 'text', nullable: true })
  error_mensaje?: string;
}
