import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';
import { Empleado } from './Empleado';

@Entity('departamento')
export class Departamento {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  nombre!: string;

  @Column({ nullable: true })
  descripcion!: string;

  @OneToMany(() => Empleado, (empleado) => empleado.departamento)
  empleados!: Empleado[];
}
