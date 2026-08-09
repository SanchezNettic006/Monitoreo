import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { RecordAsistencia } from './RecordAsistencia';

@Entity('foto_asistencia')
export class FotoAsistencia {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => RecordAsistencia, (record) => record.fotos)
  @JoinColumn({ name: 'record_asistencia_id' })
  record!: RecordAsistencia;

  @Column({ name: 'tipo_foto' })
  tipo!: string;

  @Column({ name: 'url_foto' })
  url_foto!: string;

  @Column({ name: 'created_at', nullable: true })
  fecha_captura!: Date;
}
