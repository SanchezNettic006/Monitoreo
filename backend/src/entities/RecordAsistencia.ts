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
import { PausaAsistencia } from './PausaAsistencia';
import { HoraExtra } from './HoraExtra';

@Entity('record_asistencia')
export class RecordAsistencia {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Empleado, (empleado) => empleado.records)
  @JoinColumn({ name: 'empleado_id' })
  empleado!: Empleado;

  // Columna 'date' (sin hora). Se declara explícitamente como 'date' y se maneja como
  // string 'YYYY-MM-DD': si se dejara inferir como timestamp, TypeORM la hidrata con
  // new Date('YYYY-MM-DD') (medianoche UTC) y el día se corre al anterior en zonas GMT-x.
  @Column({ name: 'fecha_asistencia', type: 'date' })
  fecha!: string;

  @Column({ name: 'check_in', type: 'timestamp', nullable: true })
  hora_entrada!: Date;

  @Column({ name: 'check_out', type: 'timestamp', nullable: true })
  hora_salida!: Date;

  @Column({ name: 'latitude_in', type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitud_entrada!: number | null;

  @Column({ name: 'longitude_in', type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitud_entrada!: number | null;

  @Column({ name: 'latitude_out', type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitud_salida!: number | null;

  @Column({ name: 'longitude_out', type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitud_salida!: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  horas_trabajadas!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  horas_extra!: number;

  @Column({ default: 'presente' })
  estado!: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  total_pausas!: number;

  @Column({ name: 'descripcion_trabajo', type: 'text', nullable: true })
  descripcion_trabajo?: string;

  // Proyecto que el propio técnico indicó haber trabajado ese día (puede diferir
  // del proyecto activo asignado a su grupo, ya que a veces rota entre proyectos).
  @Column({ name: 'proyecto_trabajado', nullable: true })
  proyecto_trabajado?: string;

  // Evitan reenviar las alertas de Telegram de "jornada sin cerrar" (primero al
  // propio técnico, y si sigue sin cerrar, escalado al líder/admin) más de una
  // vez por registro.
  @Column({ name: 'alerta_jornada_larga_tecnico_enviada', default: false })
  alerta_jornada_larga_tecnico_enviada!: boolean;

  @Column({ name: 'alerta_jornada_larga_lider_enviada', default: false })
  alerta_jornada_larga_lider_enviada!: boolean;

  @OneToMany(() => FotoAsistencia, (foto) => foto.record)
  fotos!: FotoAsistencia[];

  @OneToMany(() => ComentarioHoraExtra, (comentario) => comentario.record)
  comentarios!: ComentarioHoraExtra[];

  @OneToMany(() => PausaAsistencia, (pausa) => pausa.record)
  pausas!: PausaAsistencia[];

  @OneToMany(() => HoraExtra, (horaExtra) => horaExtra.record)
  horasExtras!: HoraExtra[];

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at!: Date;
}
