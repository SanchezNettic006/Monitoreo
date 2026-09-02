import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { RecordAsistencia } from './RecordAsistencia';
import { Usuario } from './Usuario';
import { FotoAsistencia } from './FotoAsistencia';

@Entity('hora_extra')
export class HoraExtra {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'usuario_id' })
  usuario!: Usuario;

  @Column({ name: 'usuario_id' })
  usuario_id!: number;

  @ManyToOne(() => RecordAsistencia, (record) => record.horasExtras, { nullable: true })
  @JoinColumn({ name: 'record_asistencia_id' })
  record?: RecordAsistencia;

  @Column({ name: 'record_asistencia_id', nullable: true })
  record_asistencia_id?: number;

  // Instalación/avería guardan el número NET/ticket (solo dígitos); en
  // departamentos que no usan tickets (ej. Vehículos) guarda el motivo libre.
  @Column({ name: 'numero_ticket', type: 'varchar', length: 255 })
  numero_ticket!: string;

  // Instalación se identifica con número NET; avería con número de ticket
  // (solo dígitos); motivo es texto libre para departamentos sin tickets.
  // Default 'instalacion' por compatibilidad con registros viejos.
  @Column({ name: 'tipo_trabajo', default: 'instalacion' })
  tipo_trabajo!: string; // 'instalacion' | 'averia' | 'motivo'

  @Column({ name: 'hora_inicio', type: 'timestamp' })
  hora_inicio!: Date;

  @Column({ name: 'hora_fin', type: 'timestamp', nullable: true })
  hora_fin!: Date | null;

  @Column({ name: 'duracion', type: 'decimal', precision: 5, scale: 2, nullable: true })
  duracion!: number | null;

  @Column({ name: 'latitud_inicio', type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitud_inicio!: number | null;

  @Column({ name: 'longitud_inicio', type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitud_inicio!: number | null;

  @Column({ name: 'latitud_fin', type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitud_fin!: number | null;

  @Column({ name: 'longitud_fin', type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitud_fin!: number | null;

  @Column({ default: 'iniciada' })
  estado!: string; // 'iniciada' | 'finalizada'

  // Revisión del admin sobre las horas reportadas en este ticket (solo aplica una vez finalizada)
  @Column({ name: 'estado_aprobacion', default: 'pendiente' })
  estado_aprobacion!: string; // 'pendiente' | 'aprobada' | 'rechazada'

  @Column({ name: 'horas_aprobadas', type: 'decimal', precision: 5, scale: 2, nullable: true })
  horas_aprobadas!: number | null;

  @Column({ name: 'motivo_ajuste', type: 'text', nullable: true })
  motivo_ajuste!: string | null;

  @Column({ name: 'aprobador_id', nullable: true })
  aprobador_id?: number;

  @Column({ name: 'fecha_aprobacion', type: 'timestamp', nullable: true })
  fecha_aprobacion!: Date | null;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @OneToMany(() => FotoAsistencia, (foto) => foto.horaExtra)
  fotos!: FotoAsistencia[];

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at!: Date;
}
