import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { RecordAsistencia } from './RecordAsistencia';

export enum TipoPausa {
  DESAYUNO = 'desayuno',
  COMIDA = 'comida',
  MEDICO = 'medico',
  PERSONAL = 'personal',
}

export enum EstadoPausa {
  PAUSA_ACTIVA = 'pausa_activa',
  FINALIZADA = 'finalizada',
}

@Entity('pausa_asistencia')
export class PausaAsistencia {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => RecordAsistencia, (record) => record.pausas)
  @JoinColumn({ name: 'record_asistencia_id' })
  record!: RecordAsistencia;

  @Column({ type: 'enum', enum: TipoPausa })
  tipo_pausa!: TipoPausa;

  @Column({ name: 'hora_inicio', type: 'timestamp' })
  hora_inicio!: Date;

  @Column({ name: 'hora_fin', type: 'timestamp', nullable: true })
  hora_fin!: Date | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  duracion!: number | null;

  @Column({ type: 'enum', enum: EstadoPausa, default: EstadoPausa.PAUSA_ACTIVA })
  estado!: EstadoPausa;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at!: Date;
}
