import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Empleado } from './Empleado';
import { FotoAsistencia } from './FotoAsistencia';
import { ComentarioHoraExtra } from './ComentarioHoraExtra';

@Entity('record_asistencia')
export class RecordAsistencia {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Empleado, (empleado) => empleado.records)
  @JoinColumn({ name: 'empleado_id' })
  empleado!: Empleado;

  @Column({ name: 'fecha_asistencia' })
  fecha!: Date;

  @Column({ name: 'check_in', type: 'timestamp', nullable: true })
  hora_entrada!: Date;

  @Column({ name: 'check_out', type: 'timestamp', nullable: true })
  hora_salida!: Date;

  @Column({ name: 'latitude_in', type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitud_entrada!: number;

  @Column({ name: 'longitude_in', type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitud_entrada!: number;

  @Column({ name: 'latitude_out', type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitud_salida!: number;

  @Column({ name: 'longitude_out', type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitud_salida!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  horas_trabajadas!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  horas_extra!: number;

  @Column({ default: 'presente' })
  estado!: string;

  @OneToMany(() => FotoAsistencia, (foto) => foto.record)
  fotos!: FotoAsistencia[];

  @OneToMany(() => ComentarioHoraExtra, (comentario) => comentario.record)
  comentarios!: ComentarioHoraExtra[];

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at!: Date;
}
