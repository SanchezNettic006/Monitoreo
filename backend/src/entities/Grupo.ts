import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Departamento } from './Departamento';
import { Empleado } from './Empleado';
import { AsignacionProyecto } from './AsignacionProyecto';

@Entity('grupo_trabajo')
export class Grupo {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  nombre!: string;

  @ManyToOne(() => Departamento)
  @JoinColumn({ name: 'departamento_id' })
  departamento!: Departamento;

  @Column({ name: 'departamento_id' })
  departamento_id!: number;

  @OneToMany(() => Empleado, (empleado) => empleado.grupo)
  empleados!: Empleado[];

  @OneToMany(() => AsignacionProyecto, (asignacion) => asignacion.grupo)
  asignaciones!: AsignacionProyecto[];

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;
}
