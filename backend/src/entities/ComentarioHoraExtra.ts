import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { RecordAsistencia } from './RecordAsistencia';
import { Usuario } from './Usuario';

@Entity('comentario_hora_extra')
export class ComentarioHoraExtra {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => RecordAsistencia, (record) => record.comentarios)
  @JoinColumn({ name: 'record_asistencia_id' })
  record!: RecordAsistencia;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'aprobado_por' })
  aprobador!: Usuario;

  @Column({ name: 'comentario' })
  comentario!: string;

  @Column({ default: 'pendiente' })
  estado!: string;

  @Column({ name: 'horas_aprobadas', type: 'decimal', precision: 5, scale: 2 })
  horas_extra!: number;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at!: Date;
}
