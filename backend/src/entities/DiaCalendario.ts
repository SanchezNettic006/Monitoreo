import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable } from 'typeorm';
import { Empleado } from './Empleado';

// 'medio_dia': cuenta 0.5 día de vacaciones en vez de 1 (ej. 24 y 31 de
// diciembre) — ver SolicitudService.calcularDiasSolicitud
export type TipoDiaCalendario = 'festivo' | 'no_laborable' | 'medio_dia';

// Día especial global del calendario laboral (aplica a todos los empleados,
// salvo los listados en `empleadosExceptuados`, para quienes ese día se
// evalúa como un día laborable normal — ej. un técnico que sí trabaja un
// domingo puntual marcado como no laborable para el resto)
@Entity('dia_calendario')
export class DiaCalendario {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'date' })
  fecha!: string;

  @Column({ type: 'varchar', length: 20 })
  tipo!: TipoDiaCalendario;

  @Column({ type: 'varchar', length: 150 })
  nombre!: string;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @ManyToMany(() => Empleado)
  @JoinTable({
    name: 'dia_calendario_excepcion',
    joinColumn: { name: 'dia_calendario_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'empleado_id', referencedColumnName: 'id' },
  })
  empleadosExceptuados?: Empleado[];
}
