import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
} from 'typeorm';
import { Empleado } from './Empleado';

@Entity('horario_trabajo')
export class HorarioTrabajo {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Empleado, (empleado) => empleado.horarios)
  empleado!: Empleado;

  @Column()
  dia_semana!: string;

  @Column({ type: 'time' })
  hora_entrada!: string;

  @Column({ type: 'time' })
  hora_salida!: string;

  @Column({ type: 'time', nullable: true })
  tolerancia_entrada!: string;
}
