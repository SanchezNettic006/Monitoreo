import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { RecordAsistencia } from './RecordAsistencia';
import { HoraExtra } from './HoraExtra';

@Entity('foto_asistencia')
export class FotoAsistencia {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => RecordAsistencia, (record) => record.fotos, { nullable: true })
  @JoinColumn({ name: 'record_asistencia_id' })
  record?: RecordAsistencia;

  @Column({ name: 'record_asistencia_id', nullable: true })
  record_asistencia_id?: number;

  @ManyToOne(() => HoraExtra, (horaExtra) => horaExtra.fotos, { nullable: true })
  @JoinColumn({ name: 'hora_extra_id' })
  horaExtra?: HoraExtra;

  @Column({ name: 'hora_extra_id', nullable: true })
  hora_extra_id?: number;

  @Column({ name: 'tipo_foto' })
  tipo!: string;

  @Column({ name: 'url_foto' })
  url_foto!: string;

  @Column({ name: 'created_at', nullable: true })
  fecha_captura!: Date;
}
