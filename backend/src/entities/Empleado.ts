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
  telefono!: string;

  @Column({ default: 'activo' })
  estado!: string;

  @Column()
  usuario_id!: number;

  @Column()
  departamento_id!: number;

  @OneToOne(() => Usuario, (usuario) => usuario.empleado)
  @JoinColumn({ name: 'usuario_id' })
  usuario!: Usuario;

  @ManyToOne(() => Departamento, (depto) => depto.empleados)
  @JoinColumn({ name: 'departamento_id' })
  departamento!: Departamento;

  @OneToMany(() => RecordAsistencia, (record) => record.empleado)
  records!: RecordAsistencia[];

  @OneToMany(() => HorarioTrabajo, (horario) => horario.empleado)
  horarios!: HorarioTrabajo[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
