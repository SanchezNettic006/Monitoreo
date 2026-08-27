import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SolicitudTramite } from './SolicitudTramite';

@Entity('solicitud_historial')
export class SolicitudHistorial {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => SolicitudTramite, (solicitud) => solicitud.historial)
  @JoinColumn({ name: 'solicitud_id' })
  solicitud!: SolicitudTramite;

  @Column({ name: 'solicitud_id' })
  solicitud_id!: number;

  @Column({ type: 'varchar', length: 30, nullable: true })
  estado_anterior?: string;

  @Column({ type: 'varchar', length: 30 })
  estado_nuevo!: string;

  @Column({ type: 'text', nullable: true })
  comentario?: string;

  @Column({ name: 'usuario_id', nullable: true })
  usuario_id?: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;
}
