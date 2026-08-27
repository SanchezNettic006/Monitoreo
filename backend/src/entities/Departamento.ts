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

  @Column({ nullable: true })
  email_supervisor?: string;

  @Column({ default: false })
  requiere_reporte_cierre!: boolean;

  @OneToMany(() => Empleado, (empleado) => empleado.departamento)
  empleados!: Empleado[];
}
