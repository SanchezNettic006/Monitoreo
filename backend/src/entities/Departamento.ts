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

  // false solo en departamentos cuyo personal no trabaja con tickets/NET
  // (ej. Vehículos); ahí la hora extra se reporta con un motivo libre en vez
  // de un número de instalación/avería
  @Column({ default: true })
  usa_ticket_horas_extra!: boolean;

  @OneToMany(() => Empleado, (empleado) => empleado.departamento)
  empleados!: Empleado[];
}
