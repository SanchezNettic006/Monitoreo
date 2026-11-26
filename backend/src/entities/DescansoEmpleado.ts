import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Empleado } from './Empleado';

/**
 * Día de descanso rotativo de un empleado puntual (ej. PLIN trabaja domingo y
 * rota sus días de descanso entre semana). Lo marca el líder de su
 * departamento en su propio calendario de equipo; ese día no cuenta como
 * falta en reportes ni aparece como "aún no ha iniciado" en los resúmenes
 * de asistencia del día, igual que un feriado o una solicitud aprobada.
 */
@Entity('descanso_empleado')
export class DescansoEmpleado {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Empleado)
  @JoinColumn({ name: 'empleado_id' })
  empleado!: Empleado;

  @Column({ name: 'empleado_id' })
  empleado_id!: number;

  @Column({ type: 'date' })
  fecha!: string;

  @Column({ name: 'creado_por_usuario_id', nullable: true })
  creado_por_usuario_id?: number;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;
}
