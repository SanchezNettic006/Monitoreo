import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Usuario } from './Usuario';
import { Departamento } from './Departamento';
import { RecordAsistencia } from './RecordAsistencia';
import { HorarioTrabajo } from './HorarioTrabajo';
import { Grupo } from './Grupo';

@Entity('empleado')
export class Empleado {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  nombre!: string;

  @Column()
  apellido!: string;

  @Column({ nullable: true })
  cargo!: string;

  @Column({ nullable: true })
  foto_perfil?: string;

  @Column({ nullable: true })
  telefono!: string;

  @Column({ default: 'activo' })
  estado!: string;

  @Column({ type: 'date', nullable: true })
  fecha_ingreso?: string;

  @Column({ type: 'int', default: 15 })
  dias_vacaciones_anuales!: number;

  // Fecha ('YYYY-MM-DD') del último recordatorio de "no has iniciado tu jornada"
  // enviado por Telegram (al propio técnico); evita mandarlo varias veces el mismo día.
  @Column({ type: 'date', nullable: true })
  ultimo_recordatorio_no_inicio?: string;

  // Fecha ('YYYY-MM-DD') de la última vez que se escaló al líder/admin porque
  // el técnico seguía sin marcar entrada 30 min después de su propio recordatorio.
  @Column({ type: 'date', nullable: true })
  ultimo_recordatorio_no_inicio_lider?: string;

  @Column()
  usuario_id!: number;

  @Column()
  departamento_id!: number;

  @Column({ nullable: true })
  grupo_id?: number;

  @OneToOne(() => Usuario, (usuario) => usuario.empleado)
  @JoinColumn({ name: 'usuario_id' })
  usuario!: Usuario;

  @ManyToOne(() => Departamento, (depto) => depto.empleados)
  @JoinColumn({ name: 'departamento_id' })
  departamento!: Departamento;

  @ManyToOne(() => Grupo, (grupo) => grupo.empleados, { nullable: true })
  @JoinColumn({ name: 'grupo_id' })
  grupo?: Grupo;

  @OneToMany(() => RecordAsistencia, (record) => record.empleado)
  records!: RecordAsistencia[];

  @OneToMany(() => HorarioTrabajo, (horario) => horario.empleado)
  horarios!: HorarioTrabajo[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
